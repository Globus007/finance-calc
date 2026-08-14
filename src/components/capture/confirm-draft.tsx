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
 * Expense↔Income switch rules for voice / manual (ADR-0002):
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
 * Voice and manual allow Expense↔Income switch on confirm (ADR-0002;
 * manual kind switch collapses the separate type-picker screen — issue #61).
 *
 * Amount-first layout (issue #61): Amount → Category chips (expense) → Date → Note.
 * Manual channel auto-focuses Amount so typing starts immediately.
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
  // Manual gets kind switch so type is chosen on confirm (fewer screens).
  const allowKindSwitch =
    draft.channel === "voice" || draft.channel === "manual";
  const focusAmount = initialDraft.channel === "manual";

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
      className="flex h-full flex-col bg-surface text-ink"
      role="dialog"
      aria-labelledby="confirm-draft-title"
    >
      <header className="flex items-center justify-between px-4 pt-4">
        <button
          type="button"
          onClick={onDiscard}
          className="rounded-control px-2.5 py-2 text-xs font-bold text-ink-muted transition hover:bg-surface-strong active:scale-95"
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
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-brand">
            Новая операция
          </p>
          <h1
            id="confirm-draft-title"
            className="mt-1 text-[1.55rem] font-bold tracking-[-0.045em]"
          >
            {title}
          </h1>

          {allowKindSwitch ? (
            <div
              className="ui-card mt-4 grid grid-cols-2 gap-1 p-1"
              role="group"
              aria-label="Расход или доход"
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
                  className={`cursor-pointer rounded-lg py-2.5 text-xs font-bold transition ${
                    draft.kind === opt.kind
                      ? "bg-hero text-white shadow-card"
                      : "text-ink-muted hover:bg-surface"
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
              className="mt-4 rounded-control bg-expense-soft px-3.5 py-3 text-sm text-[#C44822]"
            >
              {error}
            </p>
          ) : null}

          <label className="mt-5 block rounded-hero bg-hero px-4 py-3.5 text-white shadow-hero">
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-hero-caption">
              Сумма · BYN
            </span>
            <input
              name="amount"
              value={draft.amount}
              onChange={(e) => patch({ amount: e.target.value })}
              inputMode="decimal"
              autoComplete="off"
              autoFocus={focusAmount}
              className="mt-2 w-full border-0 bg-transparent p-0 text-[2.1rem] font-bold leading-none tracking-[-0.05em] text-white tabular-nums outline-none placeholder:text-white/35"
              aria-required
            />
          </label>

          {draft.kind === "expense" ? (
            <div className="mt-5">
              <p className="ui-kicker">Категория</p>
              <div
                className="mt-2.5 flex flex-wrap gap-2"
                role="group"
                aria-label="Категория"
                aria-required
              >
                {categories.map((c) => {
                  const selected = draft.categoryId === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => patch({ categoryId: c.id })}
                      aria-pressed={selected}
                      className={`cursor-pointer rounded-full px-3.5 py-2 text-xs font-semibold transition active:scale-[0.98] ${
                        selected
                          ? "bg-brand text-white shadow-[0_8px_16px_-12px_rgba(79,70,229,0.55)]"
                          : "border border-line bg-surface-strong text-ink-muted hover:border-brand-soft hover:bg-white"
                      }`}
                    >
                      {c.displayName}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="ui-card block px-4 py-3">
              <span className="ui-kicker">Дата</span>
              <input
                name="occurredOn"
                type="date"
                value={draft.occurredOn}
                onChange={(e) => patch({ occurredOn: e.target.value })}
                className="mt-1.5 w-full border-0 bg-transparent p-0 text-sm font-semibold text-ink outline-none"
                aria-required
              />
            </label>

            <label className="ui-card block px-4 py-3">
              <span className="ui-kicker">Заметка</span>
              <input
                name="note"
                value={draft.note}
                onChange={(e) => patch({ note: e.target.value })}
                maxLength={MAX_NOTE_LENGTH}
                className="mt-1.5 w-full border-0 bg-transparent p-0 text-sm font-semibold text-ink outline-none placeholder:text-ink-muted"
                placeholder="Необязательно"
              />
            </label>
          </div>
        </div>

        <div className="border-t border-line bg-surface-strong/90 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
          <button
            type="submit"
            disabled={!ready || isPending}
            className="ui-btn-primary w-full py-3.5"
          >
            {isPending ? "Сохраняем…" : "Сохранить"}
          </button>
        </div>
      </form>
    </div>
  );
}
