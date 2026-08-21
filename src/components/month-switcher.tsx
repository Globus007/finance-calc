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
  "flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-brand transition hover:bg-surface active:scale-95 motion-reduce:active:scale-100";
const navBtnDisabledClass =
  "flex h-11 w-11 shrink-0 cursor-not-allowed items-center justify-center rounded-full text-ink-muted/55";

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
      className="mt-4 flex items-center gap-1 rounded-full bg-white p-1 shadow-card"
      aria-label={`Выбор месяца, ${label}`}
    >
      <Link
        href={`/month?ym=${prevYm}`}
        aria-label="Предыдущий месяц"
        className={navBtnClass}
      >
        <IconArrowLeft size={18} />
      </Link>

      <p
        className="min-w-0 flex-1 truncate text-center text-[15px] font-bold tracking-[-0.03em]"
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
