import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  BOT_DRAFT_IDLE_MS,
  claimBotSessionForExtract,
  claimOpenBotSessionForCommit,
  clearBotSessionIfExtractJob,
  completeBotSessionExtract,
  isBotSessionIdleExpired,
  isOpenDraftPhase,
  ownsExtractJob,
  restoreBotSessionAfterFailedCommit,
  type BotSession,
} from "./bot-state";

const rpc = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ rpc }),
}));

const base: BotSession = {
  telegramId: "1",
  phase: "confirm",
  draft: {
    kind: "expense",
    channel: "photo",
    amount: "1.00",
    occurredOn: "2026-08-10",
    categoryId: "c",
    note: "",
  },
  cardChatId: 1,
  cardMessageId: 2,
  progressMessageId: null,
  extractJobId: null,
  categoryPage: 0,
  updatedAt: "2026-08-10T10:00:00.000Z",
};

describe("isBotSessionIdleExpired", () => {
  it("is false within 24h", () => {
    const now = new Date("2026-08-10T12:00:00.000Z");
    expect(isBotSessionIdleExpired(base, now)).toBe(false);
  });

  it("is true after 24h idle", () => {
    const now = new Date(
      Date.parse(base.updatedAt) + BOT_DRAFT_IDLE_MS + 1,
    );
    expect(isBotSessionIdleExpired(base, now)).toBe(true);
  });

  it("ignores idle phase", () => {
    expect(
      isBotSessionIdleExpired(
        { ...base, phase: "idle", draft: null },
        new Date("2099-01-01T00:00:00.000Z"),
      ),
    ).toBe(false);
  });
});

describe("isOpenDraftPhase", () => {
  it("covers confirm and field-awaiting phases", () => {
    expect(isOpenDraftPhase("confirm")).toBe(true);
    expect(isOpenDraftPhase("awaiting_amount")).toBe(true);
    expect(isOpenDraftPhase("extracting")).toBe(false);
    expect(isOpenDraftPhase("idle")).toBe(false);
  });
});

describe("ownsExtractJob", () => {
  it("requires extracting phase and matching job id", () => {
    const extracting: BotSession = {
      ...base,
      phase: "extracting",
      draft: null,
      extractJobId: "job-a",
    };
    expect(ownsExtractJob(extracting, "job-a")).toBe(true);
    expect(ownsExtractJob(extracting, "job-b")).toBe(false);
    expect(ownsExtractJob({ ...extracting, phase: "confirm" }, "job-a")).toBe(
      false,
    );
    expect(ownsExtractJob(null, "job-a")).toBe(false);
  });
});

describe("claimOpenBotSessionForCommit", () => {
  beforeEach(() => {
    rpc.mockReset();
  });

  it("maps a claimed row from the RPC and returns the Draft snapshot", async () => {
    rpc.mockResolvedValue({
      data: {
        telegram_id: "42",
        phase: "confirm",
        draft: base.draft,
        card_chat_id: 9,
        card_message_id: 11,
        progress_message_id: null,
        extract_job_id: null,
        category_page: 2,
        updated_at: "2026-08-10T10:00:00.000Z",
      },
      error: null,
    });

    const claimed = await claimOpenBotSessionForCommit({
      telegramId: "42",
      cardMessageId: 11,
    });

    expect(rpc).toHaveBeenCalledWith(
      "claim_telegram_bot_session_for_commit",
      {
        p_telegram_id: "42",
        p_card_message_id: 11,
      },
    );
    expect(claimed).toEqual({
      telegramId: "42",
      phase: "confirm",
      draft: base.draft,
      cardChatId: 9,
      cardMessageId: 11,
      progressMessageId: null,
      extractJobId: null,
      categoryPage: 2,
      updatedAt: "2026-08-10T10:00:00.000Z",
    });
  });

  it("returns null when another Commit or Discard already claimed the Draft", async () => {
    rpc.mockResolvedValue({ data: null, error: null });

    await expect(
      claimOpenBotSessionForCommit({
        telegramId: "42",
        cardMessageId: 11,
      }),
    ).resolves.toBeNull();
  });
});

describe("restoreBotSessionAfterFailedCommit", () => {
  beforeEach(() => {
    rpc.mockReset();
  });

  it("restores when the session is still idle after claim", async () => {
    rpc.mockResolvedValue({ data: true, error: null });

    await expect(
      restoreBotSessionAfterFailedCommit({
        telegramId: "42",
        phase: "confirm",
        draft: base.draft!,
        cardChatId: 9,
        cardMessageId: 11,
        progressMessageId: null,
        categoryPage: 2,
      }),
    ).resolves.toBe(true);

    expect(rpc).toHaveBeenCalledWith(
      "restore_telegram_bot_session_after_failed_commit",
      {
        p_telegram_id: "42",
        p_phase: "confirm",
        p_draft: base.draft,
        p_card_chat_id: 9,
        p_card_message_id: 11,
        p_progress_message_id: null,
        p_category_page: 2,
      },
    );
  });

  it("returns false when a newer extract/Draft already owns the session", async () => {
    rpc.mockResolvedValue({ data: false, error: null });

    await expect(
      restoreBotSessionAfterFailedCommit({
        telegramId: "42",
        phase: "confirm",
        draft: base.draft!,
        cardChatId: 9,
        cardMessageId: 11,
      }),
    ).resolves.toBe(false);
  });
});

describe("claimBotSessionForExtract", () => {
  beforeEach(() => {
    rpc.mockReset();
  });

  it("returns previous snapshot when claim succeeds", async () => {
    rpc.mockResolvedValue({
      data: {
        previous: {
          telegram_id: "7",
          phase: "confirm",
          draft: base.draft,
          card_chat_id: 3,
          card_message_id: 4,
          progress_message_id: null,
          extract_job_id: null,
          category_page: 0,
          updated_at: "2026-08-10T10:00:00.000Z",
        },
      },
      error: null,
    });

    const claimed = await claimBotSessionForExtract({
      telegramId: "7",
      extractJobId: "job-1",
    });

    expect(rpc).toHaveBeenCalledWith(
      "claim_telegram_bot_session_for_extract",
      {
        p_telegram_id: "7",
        p_extract_job_id: "job-1",
      },
    );
    expect(claimed?.previous).toEqual({
      telegramId: "7",
      phase: "confirm",
      draft: base.draft,
      cardChatId: 3,
      cardMessageId: 4,
      progressMessageId: null,
      extractJobId: null,
      categoryPage: 0,
      updatedAt: "2026-08-10T10:00:00.000Z",
    });
  });

  it("returns null when another extract already owns the session", async () => {
    rpc.mockResolvedValue({ data: null, error: null });

    await expect(
      claimBotSessionForExtract({
        telegramId: "7",
        extractJobId: "job-2",
      }),
    ).resolves.toBeNull();
  });
});

describe("completeBotSessionExtract / clearBotSessionIfExtractJob", () => {
  beforeEach(() => {
    rpc.mockReset();
  });

  it("complete returns true only when RPC reports ownership", async () => {
    rpc.mockResolvedValue({ data: true, error: null });

    await expect(
      completeBotSessionExtract({
        telegramId: "7",
        extractJobId: "job-1",
        draft: base.draft!,
        cardChatId: 1,
        cardMessageId: 2,
      }),
    ).resolves.toBe(true);

    expect(rpc).toHaveBeenCalledWith(
      "complete_telegram_bot_session_extract",
      {
        p_telegram_id: "7",
        p_extract_job_id: "job-1",
        p_draft: base.draft,
        p_card_chat_id: 1,
        p_card_message_id: 2,
      },
    );
  });

  it("complete returns false when job was cancelled or superseded", async () => {
    rpc.mockResolvedValue({ data: false, error: null });

    await expect(
      completeBotSessionExtract({
        telegramId: "7",
        extractJobId: "stale",
        draft: base.draft!,
        cardChatId: 1,
        cardMessageId: 2,
      }),
    ).resolves.toBe(false);
  });

  it("clear returns whether the extract job still owned the row", async () => {
    rpc.mockResolvedValue({ data: true, error: null });

    await expect(
      clearBotSessionIfExtractJob({
        telegramId: "7",
        extractJobId: "job-1",
      }),
    ).resolves.toBe(true);

    expect(rpc).toHaveBeenCalledWith("clear_telegram_bot_session_extract", {
      p_telegram_id: "7",
      p_extract_job_id: "job-1",
    });
  });
});
