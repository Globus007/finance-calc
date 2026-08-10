import { describe, expect, it } from "vitest";
import {
  BOT_DRAFT_IDLE_MS,
  isBotSessionIdleExpired,
  isOpenDraftPhase,
  type BotSession,
} from "./bot-state";

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
