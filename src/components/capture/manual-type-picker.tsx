"use client";

import type { RecordKind } from "@/lib/draft/types";

type Props = {
  onPick: (kind: RecordKind) => void;
  onDismiss: () => void;
};

/**
 * Manual capture step: explicit Expense vs Income before confirm (ADR-0002).
 */
export function ManualTypePicker({ onPick, onDismiss }: Props) {
  return (
    <div
      className="flex h-full flex-col bg-[#F3F0FA]"
      role="dialog"
      aria-labelledby="manual-type-title"
    >
      <header className="flex items-center justify-between px-4 pt-3">
        <button
          type="button"
          onClick={onDismiss}
          className="cursor-pointer text-xs font-semibold text-[#1A1B2E]/45"
        >
          Отменить
        </button>
        <span className="w-14" />
      </header>

      <div className="flex min-h-0 flex-1 flex-col px-4 pt-6">
        <h1 id="manual-type-title" className="text-2xl font-bold tracking-tight">
          Вручную
        </h1>
        <p className="mt-1 text-sm text-[#1A1B2E]/45">
          Что хотите записать?
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => onPick("expense")}
            className="cursor-pointer rounded-[1.25rem] bg-white px-5 py-5 text-left shadow-[0_8px_24px_-12px_rgba(26,27,46,0.18)] ring-1 ring-[#1A1B2E]/6 transition active:scale-[0.99]"
          >
            <p className="text-base font-bold text-[#F97316]">Расход</p>
            <p className="mt-1 text-xs text-[#1A1B2E]/45">
              Сумма, дата и категория
            </p>
          </button>
          <button
            type="button"
            onClick={() => onPick("income")}
            className="cursor-pointer rounded-[1.25rem] bg-white px-5 py-5 text-left shadow-[0_8px_24px_-12px_rgba(26,27,46,0.18)] ring-1 ring-[#1A1B2E]/6 transition active:scale-[0.99]"
          >
            <p className="text-base font-bold text-[#10B981]">Доход</p>
            <p className="mt-1 text-xs text-[#1A1B2E]/45">
              Сумма и дата, без категории
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}
