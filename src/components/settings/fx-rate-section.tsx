"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  resetRateOverride,
  saveRateOverride,
  type RateOverrideResult,
} from "@/app/(app)/settings/actions";
import type { RateCurrency } from "@/lib/fx";

type Props = {
  /** Which Currency this section edits (USD / EUR). */
  currency: RateCurrency;
  /** Ready-made active-rate line, e.g. "$1 = 3,3012 · NBRB 12.02" or "· own". */
  activeLine: string | null;
  /** Where the active rate comes from — drives the reset button visibility. */
  source: "nbrb" | "override" | null;
  /** Injectable for tests. */
  saveFn?: (input: { currency: RateCurrency; rate: string }) => Promise<RateOverrideResult>;
  resetFn?: (input: { currency: RateCurrency }) => Promise<RateOverrideResult>;
};

const RATE_ERROR_MESSAGES: Record<string, string> = {
  rate_required: "Укажите курс больше нуля.",
  rate_too_large: "Курс слишком большой.",
  unavailable: "Не удалось сохранить курс. Попробуйте ещё раз.",
};

const SECTION_TITLE: Record<RateCurrency, string> = {
  USD: "Курс доллара",
  EUR: "Курс евро",
};

const INPUT_LABEL: Record<RateCurrency, string> = {
  USD: "Свой курс · BYN за $1",
  EUR: "Свой курс · BYN за €1",
};

/** Fx rate section (stories #4–#7, per Currency since #85): view, set, reset. */
export function FxRateSection({
  currency,
  activeLine,
  source,
  saveFn = saveRateOverride,
  resetFn = resetRateOverride,
}: Props) {
  const router = useRouter();
  const [rate, setRate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function run(action: () => Promise<RateOverrideResult>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.status === "ok") {
        setRate("");
        router.refresh();
        return;
      }
      setError(RATE_ERROR_MESSAGES[result.reason] ?? RATE_ERROR_MESSAGES.unavailable);
    });
  }

  return (
    <div className="rounded-2xl bg-white p-4 shadow-card">
      <p className="ui-kicker">{SECTION_TITLE[currency]}</p>

      <p
        className="mt-1 text-sm font-semibold tabular-nums text-ink"
        aria-live="polite"
        data-testid={`active-rate-line-${currency}`}
      >
        {activeLine ?? "Курс пока недоступен"}
      </p>
      <p className="mt-1 text-[11px] leading-snug text-ink-muted">
        Официальный курс НБРБ обновляется не чаще раза в сутки; можно задать
        свой.
      </p>

      {error ? (
        <p
          role="alert"
          className="mt-2 rounded-control bg-expense-soft px-3 py-2 text-sm text-expense"
        >
          {error}
        </p>
      ) : null}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!isPending) run(() => saveFn({ currency, rate }));
        }}
        className="mt-3 flex items-end gap-2"
      >
        <label className="min-w-0 flex-1">
          <span className="text-[12px] font-medium text-ink-muted">
            {INPUT_LABEL[currency]}
          </span>
          <input
            name="rate"
            value={rate}
            onChange={(e) => {
              setError(null);
              setRate(e.target.value);
            }}
            inputMode="decimal"
            autoComplete="off"
            placeholder="3,35"
            aria-label={INPUT_LABEL[currency]}
            className="ui-field mt-1 w-full font-semibold tabular-nums"
          />
        </label>
        <button
          type="submit"
          disabled={isPending}
          className="ui-btn-primary shrink-0 px-5 py-2.5 text-sm"
        >
          Задать
        </button>
      </form>

      {source === "override" ? (
        <button
          type="button"
          onClick={() => {
            if (!isPending) run(() => resetFn({ currency }));
          }}
          disabled={isPending}
          className="mt-2 min-h-9 cursor-pointer rounded-full px-3 text-[13px] font-semibold text-ink-muted transition hover:text-ink active:scale-95 disabled:opacity-40"
        >
          Сбросить к курсу НБРБ
        </button>
      ) : null}
    </div>
  );
}
