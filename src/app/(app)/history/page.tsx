import Link from "next/link";
import { HistoryPanel } from "@/components/history-panel";
import { IconArrowLeft, IconTransfer } from "@/components/icons";
import { listAccounts } from "@/lib/accounts/load-accounts";
import { loadCategoriesForHistoryFilter } from "@/lib/categories/load-categories";
import { loadHistory } from "@/lib/money/load-money";

/**
 * Full mixed History of committed Expenses, Incomes, and Transfers (no Drafts).
 * Filters (kind / Account / Category / Occurred on range) are query-only UI
 * over the list.
 */
export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ acc?: string }>;
}) {
  const params = await searchParams;
  const requested = params.acc?.trim() || null;
  const [items, categories, accounts] = await Promise.all([
    loadHistory(),
    loadCategoriesForHistoryFilter(),
    listAccounts(),
  ]);
  const initialAccountId =
    requested && accounts.some((a) => a.id === requested) ? requested : null;

  return (
    <div className="ui-page">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href="/" className="ui-back">
            <IconArrowLeft size={14} /> Домой
          </Link>
          <h1 className="mt-2 text-[1.55rem] font-bold tracking-[-0.04em]">
            История
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Расходы, доходы и переводы · по дате
          </p>
        </div>

        <Link
          href="/transfer"
          aria-label="Перевод между счетами"
          className="flex shrink-0 items-center gap-1.5 rounded-full bg-white px-3 py-2 text-[12px] font-bold text-ink shadow-card transition hover:bg-white active:scale-95"
        >
          <IconTransfer size={15} />
          Перевод
        </Link>
      </div>

      <HistoryPanel
        items={items}
        categories={categories}
        accounts={accounts}
        initialAccountId={initialAccountId}
      />
    </div>
  );
}
