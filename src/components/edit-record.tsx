"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  deleteCommittedRecord,
  editCommittedRecord,
  type DeleteRecordResult,
  type EditRecordInput,
  type EditRecordResult,
} from "@/app/(app)/history/actions";
import { IconArrowLeft } from "@/components/icons";
import type { CategoryPickerItem } from "@/lib/categories/types";
import type { Draft } from "@/lib/draft/types";
import { MAX_NOTE_LENGTH } from "@/lib/draft/normalize-note";
import { canCommit } from "@/lib/draft/validate-commit";
import {
  deleteErrorMessage,
  editErrorMessage,
} from "@/lib/money/error-messages";
import type { EditableRecord } from "@/lib/money/edit-types";
import { formatAmountInput } from "@/lib/money/format-amount-input";
import { channelLabelRu } from "@/lib/money/channel-label";

type Props = {
  record: EditableRecord;
  categories: CategoryPickerItem[];
  /** Injectable for tests. */
  editFn?: (input: EditRecordInput) => Promise<EditRecordResult>;
  deleteFn?: (
    kind: EditableRecord["kind"],
    id: string,
  ) => Promise<DeleteRecordResult>;
};

/**
 * Edit / Delete form for one committed Expense or Income.
 * Not a Draft: Channel and kind are shown read-only and never sent as mutable.
 */
export function EditRecord({
  record,
  categories,
  editFn = editCommittedRecord,
  deleteFn = deleteCommittedRecord,
}: Props) {
  const router = useRouter();
  const [amount, setAmount] = useState(formatAmountInput(record.amount));
  const [occurredOn, setOccurredOn] = useState(record.occurredOn);
  const [categoryId, setCategoryId] = useState(record.categoryId ?? "");
  const [note, setNote] = useState(record.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Channel stand-in for canCommit only; form never edits provenance.
  const draftShape: Draft = {
    kind: record.kind,
    channel: record.kind === "income" ? "manual" : record.channel,
    amount,
    occurredOn,
    categoryId,
    note,
  };
  const ready = canCommit(draftShape);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready || isPending) return;

    setError(null);
    startTransition(async () => {
      const result = await editFn({
        id: record.id,
        kind: record.kind,
        amount,
        occurredOn,
        categoryId,
        note,
      });

      if (result.status === "ok") {
        router.push("/history");
        router.refresh();
        return;
      }
      setError(editErrorMessage(result.reason));
    });
  }

  function onDelete() {
    const label = record.kind === "expense" ? "расход" : "доход";
    if (!window.confirm(`Удалить этот ${label}?`)) return;

    setError(null);
    startTransition(async () => {
      const result = await deleteFn(record.kind, record.id);
      if (result.status === "ok") {
        router.push("/history");
        router.refresh();
        return;
      }
      setError(deleteErrorMessage(result.reason));
    });
  }

  const title =
    record.kind === "expense" ? "Редактирование расхода" : "Редактирование дохода";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="px-4 pt-3">
        <Link
          href="/history"
          className="inline-flex items-center gap-1 text-xs font-semibold text-[#5B6CFF]"
        >
          <IconArrowLeft size={14} /> История
        </Link>
      </div>

      <form
        onSubmit={onSubmit}
        className="flex min-h-0 flex-1 flex-col"
        noValidate
      >
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-2">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="mt-1 text-xs text-[#1A1B2E]/40">
            Способ: {channelLabelRu(record.channel)} · не меняется
          </p>

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
              value={amount}
              onChange={(e) => {
                setError(null);
                setAmount(e.target.value);
              }}
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
              value={occurredOn}
              onChange={(e) => {
                setError(null);
                setOccurredOn(e.target.value);
              }}
              className="mt-1.5 w-full rounded-2xl border-0 bg-white px-4 py-3 text-sm outline-none ring-1 ring-[#1A1B2E]/8 focus:ring-2 focus:ring-[#5B6CFF]"
              aria-required
            />
          </label>

          {record.kind === "expense" ? (
            <label className="mt-3 block text-[10px] font-bold uppercase tracking-wider text-[#1A1B2E]/40">
              Категория
              <select
                name="categoryId"
                value={categoryId}
                onChange={(e) => {
                  setError(null);
                  setCategoryId(e.target.value);
                }}
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
              value={note}
              onChange={(e) => {
                setError(null);
                setNote(e.target.value);
              }}
              maxLength={MAX_NOTE_LENGTH}
              className="mt-1.5 w-full rounded-2xl border-0 bg-white px-4 py-3 text-sm outline-none ring-1 ring-[#1A1B2E]/8 focus:ring-2 focus:ring-[#5B6CFF]"
            />
          </label>
        </div>

        <div className="space-y-2 px-4 pb-5 pt-2">
          <button
            type="submit"
            disabled={!ready || isPending}
            className="w-full cursor-pointer rounded-2xl bg-gradient-to-r from-[#5B6CFF] to-[#4F46E5] py-4 text-sm font-bold text-white shadow-lg shadow-[#5B6CFF]/35 transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-30"
          >
            {isPending ? "Сохраняем…" : "Сохранить"}
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={isPending}
            className="w-full cursor-pointer rounded-2xl bg-white py-3.5 text-sm font-bold text-[#B91C1C] ring-1 ring-[#FECACA] transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Удалить
          </button>
        </div>
      </form>
    </div>
  );
}
