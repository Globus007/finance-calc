import Link from "next/link";
import { IconArrowLeft } from "@/components/icons";
import {
  currentYearMonth,
  monthLabelRu,
  shiftYearMonth,
} from "@/lib/dates/minsk-month";

type Props = {
  /** Selected calendar month as YYYY-MM (Europe/Minsk product calendar). */
  yearMonth: string;
  /**
   * Latest month the user may browse (default: current Europe/Minsk month).
   * Past + current only — future months are out of product scope for MVP.
   */
  maxYearMonth?: string;
};

const navBtnClass =
  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line bg-surface-strong text-brand shadow-card transition active:scale-95";
const navBtnDisabledClass =
  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line bg-surface-strong/70 text-brand/35";

/**
 * Prev/next month navigation for the Month surface.
 * Selection is carried in `?ym=YYYY-MM`; Month page resolves and loads totals.
 * Next is disabled at the current (or `maxYearMonth`) calendar month.
 */
export function MonthSwitcher({
  yearMonth,
  maxYearMonth = currentYearMonth(),
}: Props) {
  const prevYm = shiftYearMonth(yearMonth, -1);
  const nextYm = shiftYearMonth(yearMonth, 1);
  const canGoNext = yearMonth < maxYearMonth;
  const label = monthLabelRu(yearMonth);

  return (
    <nav
      className="mt-3 flex items-center justify-between gap-2"
      aria-label="Выбор месяца"
    >
      <Link
        href={`/month?ym=${prevYm}`}
        aria-label="Предыдущий месяц"
        className={navBtnClass}
      >
        <IconArrowLeft size={18} />
      </Link>

      <p
        className="min-w-0 truncate text-center text-sm font-semibold tracking-tight"
        aria-live="polite"
      >
        {label}
      </p>

      {canGoNext ? (
        <Link
          href={`/month?ym=${nextYm}`}
          aria-label="Следующий месяц"
          className={navBtnClass}
        >
          <span className="inline-flex rotate-180">
            <IconArrowLeft size={18} />
          </span>
        </Link>
      ) : (
        <button
          type="button"
          disabled
          aria-label="Следующий месяц"
          className={navBtnDisabledClass}
        >
          <span className="inline-flex rotate-180">
            <IconArrowLeft size={18} />
          </span>
        </button>
      )}
    </nav>
  );
}
