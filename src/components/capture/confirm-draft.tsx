"use client";

import { useState, useTransition } from "react";
import {
  commitDraft,
  commitPhotoDraft,
  commitVoiceDraft,
  type CommitDraftResult,
} from "@/app/(app)/capture/actions";
import type { CategoryPickerItem } from "@/lib/categories/types";
import { commitErrorMessage } from "@/lib/draft/error-messages";
import type { Draft, RecordKind } from "@/lib/draft/types";
import { canCommit } from "@/lib/draft/validate-commit";
import { MAX_NOTE_LENGTH } from "@/lib/draft/normalize-note";

type CommitInput = {
  kind: Draft["kind"];
  amount: string;
  occurredOn: string;
  categoryId: string;
  note: string;
};

type Props = {
  initialDraft: Draft;
  categories: CategoryPickerItem[];
  onDiscard: () => void;
  onCommitted: () => void;
  /** Injectable for tests; defaults by channel (manual / photo / voice). */
  commitFn?: (input: CommitInput) => Promise<CommitDraftResult>;
};

function defaultCommitFor(draft: Draft) {
  if (draft.channel === "photo") return commitPhotoDraft;
  if (draft.channel === "voice") return commitVoiceDraft;
  return commitDraft;
}

/**
 * Expense↔Income switch rules for voice (ADR-0002):
 * Expense→Income drops Category; Income→Expense clears Category until user picks.
 * Amount / Occurred on / Note are kept.
 */
export function switchDraftKind(draft: Draft, kind: RecordKind): Draft {
  if (draft.kind === kind) return draft;
  if (kind === "income") {
    return { ...draft, kind: "income", categoryId: "" };
  }
  return { ...draft, kind: "expense", categoryId: "" };
}

/**
 * Confirm form for one in-flight Draft (ADR-0003).
 * Channel is not shown or edited. Commit failure keeps Draft for retry.
 * Voice allows Expense↔Income switch on confirm (ADR-0002).
 */
export function ConfirmDraft({
  initialDraft,
  categories,
  onDiscard,
  onCommitted,
  commitFn,
}: Props) {
  const resolveCommit = commitFn ?? defaultCommitFor(initialDraft);
  const [draft, setDraft] = useState<Draft>(initialDraft);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const ready = canCommit(draft);
  const allowKindSwitch = draft.channel === "voice";

  function patch(partial: Partial<Draft>) {
    setError(null);
    setDraft((d) => ({ ...d, ...partial }));
  }

  function onKindSwitch(kind: RecordKind) {
    setError(null);
    setDraft((d) => switchDraftKind(d, kind));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready || isPending) return;

    setError(null);
    startTransition(async () => {
      const result = await resolveCommit({
        kind: draft.kind,
        amount: draft.amount,
        occurredOn: draft.occurredOn,
        categoryId: draft.categoryId,
        note: draft.note,
      });

      if (result.status === "ok") {
        onCommitted();
        return;
      }
      // Commit failure: stay on confirm with Draft intact (ADR-0008).
      setError(commitErrorMessage(result.reason));
    });
  }

  const title =
    draft.kind === "expense" ? "Подтверждение расхода" : "Подтверждение дохода";

  return (
    <div
      className="flex h-full flex-col bg-[#F3F0FA]"
      role="dialog"
      aria-labelledby="confirm-draft-title"
    >
      <header className="flex items-center justify-between px-4 pt-3">
        <button
          type="button"
          onClick={onDiscard}
          className="cursor-pointer text-xs font-semibold text-[#1A1B2E]/45"
        >
          Отбросить
        </button>
        <span className="w-14" />
      </header>

      <form
        onSubmit={onSubmit}
        className="flex min-h-0 flex-1 flex-col"
        noValidate
      >
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-3">
          <h1
            id="confirm-draft-title"
            className="text-2xl font-bold tracking-tight"
          >
            {title}
          </h1>

          {allowKindSwitch ? (
            <div
              className="mt-3 flex gap-2"
              role="group"
              aria-label="Тип записи"
            >
              {(
                [
                  { kind: "expense" as const, label: "Расход" },
                  { kind: "income" as const, label: "Доход" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.kind}
                  type="button"
                  onClick={() => onKindSwitch(opt.kind)}
                  aria-pressed={draft.kind === opt.kind}
                  className={`flex-1 cursor-pointer rounded-xl py-2.5 text-xs font-bold transition ${
                    draft.kind === opt.kind
                      ? "bg-[#5B6CFF] text-white shadow-md shadow-[#5B6CFF]/30"
                      : "bg-white text-[#1A1B2E]/45 ring-1 ring-[#1A1B2E]/8"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          ) : null}

          {error !== null ? (
            <p
              role="alert"
              className="mt-3 rounded-2xl bg-[#FEF2F2] px-3 py-2 text-sm text-[#B91C1C]"
            >
              {error}
            </p>
          ) : null}

          <label className="mt-5 block text-[10px] font-bold uppercase tracking-wider text-[#1A1B2E]/40">
            Сумма (BYN)
            <input
              name="amount"
              value={draft.amount}
              onChange={(e) => patch({ amount: e.target.value })}
              inputMode="decimal"
              autoComplete="off"
              className="mt-1.5 w-full rounded-2xl border-0 bg-white px-4 py-3.5 text-xl font-bold tabular-nums outline-none ring-1 ring-[#1A1B2E]/8 focus:ring-2 focus:ring-[#5B6CFF]"
              aria-required
            />
          </label>

          <label className="mt-3 block text-[10px] font-bold uppercase tracking-wider text-[#1A1B2E]/40">
            Дата
            <input
              name="occurredOn"
              type="date"
              value={draft.occurredOn}
              onChange={(e) => patch({ occurredOn: e.target.value })}
              className="mt-1.5 w-full rounded-2xl border-0 bg-white px-4 py-3 text-sm outline-none ring-1 ring-[#1A1B2E]/8 focus:ring-2 focus:ring-[#5B6CFF]"
              aria-required
            />
          </label>

          {draft.kind === "expense" ? (
            <label className="mt-3 block text-[10px] font-bold uppercase tracking-wider text-[#1A1B2E]/40">
              Категория
              <select
                name="categoryId"
                value={draft.categoryId}
                onChange={(e) => patch({ categoryId: e.target.value })}
                className="mt-1.5 w-full rounded-2xl border-0 bg-white px-4 py-3 text-sm outline-none ring-1 ring-[#1A1B2E]/8 focus:ring-2 focus:ring-[#5B6CFF]"
                aria-required
              >
                <option value="">Выберите…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.displayName}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <label className="mt-3 block text-[10px] font-bold uppercase tracking-wider text-[#1A1B2E]/40">
            Заметка
            <input
              name="note"
              value={draft.note}
              onChange={(e) => patch({ note: e.target.value })}
              maxLength={MAX_NOTE_LENGTH}
              className="mt-1.5 w-full rounded-2xl border-0 bg-white px-4 py-3 text-sm outline-none ring-1 ring-[#1A1B2E]/8 focus:ring-2 focus:ring-[#5B6CFF]"
            />
          </label>
        </div>

        <div className="px-4 pb-5 pt-2">
          <button
            type="submit"
            disabled={!ready || isPending}
            className="w-full cursor-pointer rounded-2xl bg-gradient-to-r from-[#5B6CFF] to-[#4F46E5] py-4 text-sm font-bold text-white shadow-lg shadow-[#5B6CFF]/35 transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-30"
          >
            {isPending ? "Сохраняем…" : "Сохранить"}
          </button>
        </div>
      </form>
    </div>
  );
}
