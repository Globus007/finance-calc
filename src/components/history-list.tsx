import Link from "next/link";
import type { Account } from "@/lib/accounts/types";
import {
  IconArrowDownLeft,
  IconArrowUpRight,
  IconTransfer,
} from "@/components/icons";
import { channelLabelRu } from "@/lib/money/channel-label";
import {
  formatAmountBadge,
  formatByn,
  formatMoney,
  formatShortDate,
} from "@/lib/money/format";
import { nativeAmount } from "@/lib/money/history-types";
import type {
  HistoryEntry,
  HistoryItem,
  TransferItem,
} from "@/lib/money/history-types";

type Props = {
  entries: HistoryEntry[];
  /** id → Account for row labels; empty map hides Account copy. */
  accountById?: Record<string, Account>;
  /** Show each row's Account (aggregate view); off inside one Account view. */
  showAccountNames?: boolean;
  /** Empty-state copy (Russian). */
  emptyMessage?: string;
};

export const EMPTY_HISTORY_MESSAGE =
  "Пока нет записей. Добавьте расход или доход через панель захвата.";

/**
 * Mixed committed History list (Expenses + Incomes + Transfers by Occurred on).
 * Rows link to Edit / Delete. Presentational — data loaded by RSC parents.
 */
export function HistoryList({
  entries,
  accountById = {},
  showAccountNames = false,
  emptyMessage = EMPTY_HISTORY_MESSAGE,
}: Props) {
  if (entries.length === 0) {
    return <p className="ui-empty">{emptyMessage}</p>;
  }

  return (
    <ul className="mt-2.5 min-w-0 space-y-2" aria-label="История">
      {entries.map((entry) =>
        entry.kind === "transfer" ? (
          <TransferRow
            key={`transfer-${entry.id}`}
            item={entry}
            accountById={accountById}
          />
        ) : (
          <RecordRow
            key={`${entry.kind}-${entry.id}`}
            item={entry}
            account={entry.accountId ? accountById[entry.accountId] : undefined}
            showAccountName={showAccountNames}
          />
        ),
      )}
    </ul>
  );
}

function RecordRow({
  item,
  account,
  showAccountName,
}: {
  item: HistoryItem;
  account: Account | undefined;
  showAccountName: boolean;
}) {
  const isIncome = item.kind === "income";
  const title = isIncome
    ? item.note || "Доход"
    : item.categoryDisplayName || "Расход";

  // One Account: native Currency, exact. All-Account list: canonical BYN
  // with «≈» (history never re-converts; ADR-0014).
  const mixed = showAccountName;
  const currency = mixed ? "BYN" : (account?.currency ?? "BYN");
  const shown = mixed
    ? item.amount
    : account
      ? nativeAmount(item, account.currency)
      : item.amount;
  const showNativeBadge =
    item.snapshot != null && (mixed || !account || account.currency === "BYN");

  const subtitleParts = [
    formatShortDate(item.occurredOn),
    showAccountName && account ? account.name : null,
    !isIncome && item.note ? item.note : null,
    showNativeBadge && item.snapshot
      ? formatAmountBadge(item.snapshot)
      : null,
    channelLabelRu(item.channel),
  ].filter(Boolean);

  const href = `/history/${item.kind}/${item.id}`;
  const a11yLabel = isIncome
    ? `Редактировать доход ${title}`
    : `Редактировать расход ${title}`;

  return (
    <li>
      <Link
        href={href}
        aria-label={a11yLabel}
        className="ui-row group flex w-full min-w-0 items-center gap-2.5 px-0.5 py-2.5 transition hover:bg-[#f7f4fb] active:scale-[0.99]"
      >
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.85rem] ${
            isIncome
              ? "bg-positive-soft text-positive"
              : "bg-expense-soft text-expense"
          }`}
          aria-hidden
        >
          {isIncome ? (
            <IconArrowDownLeft size={18} />
          ) : (
            <IconArrowUpRight size={18} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold tracking-[-0.01em] text-ink">{title}</p>
          <p className="mt-0.5 truncate text-[11px] text-ink-muted">
            {subtitleParts.join(" · ")}
          </p>
        </div>
        <p
          className={`shrink-0 text-[13px] font-bold tracking-[-0.025em] tabular-nums ${
            isIncome ? "text-positive" : "text-ink"
          }`}
        >
          {mixed ? "≈ " : ""}
          {isIncome ? "+" : "−"}
          {currency === "BYN"
            ? formatByn(shown)
            : formatMoney(shown, currency)}
        </p>
      </Link>
    </li>
  );
}

function TransferRow({
  item,
  accountById,
}: {
  item: TransferItem;
  accountById: Record<string, Account>;
}) {
  const source = accountById[item.sourceAccountId];
  const target = accountById[item.targetAccountId];
  const sourceCurrency = source?.currency ?? "BYN";
  const targetCurrency = target?.currency ?? "BYN";

  const title = "Перевод";
  const route = [
    source?.name ?? "—",
    "→",
    target?.name ?? "—",
  ].join(" ");

  const subtitleParts = [
    route,
    formatShortDate(item.occurredOn),
    item.note,
    sourceCurrency === targetCurrency
      ? null
      : `по ${item.fxRate.toLocaleString("ru-BY", {
          minimumFractionDigits: 4,
          maximumFractionDigits: 4,
        })}`,
  ].filter(Boolean);

  return (
    <li>
      <Link
        href={`/history/transfer/${item.id}`}
        aria-label={`Редактировать перевод ${route}`}
        className="ui-row group flex w-full min-w-0 items-center gap-2.5 px-0.5 py-2.5 transition hover:bg-[#f7f4fb] active:scale-[0.99]"
      >
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.85rem] bg-transfer-soft text-transfer"
          aria-hidden
        >
          <IconTransfer size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold tracking-[-0.01em] text-ink">
            {title}
          </p>
          <p className="mt-0.5 truncate text-[11px] text-ink-muted">
            {subtitleParts.join(" · ")}
          </p>
        </div>
        <p className="shrink-0 text-right text-[13px] font-bold tracking-[-0.025em] tabular-nums text-ink">
          {formatMoney(item.amount, sourceCurrency)}
          <span className="mx-1 font-semibold text-ink-muted">→</span>
          {formatMoney(item.convertedAmount, targetCurrency)}
        </p>
      </Link>
    </li>
  );
}
