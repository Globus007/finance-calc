import Link from "next/link";
import { HistoryPanel } from "@/components/history-panel";
import { IconArrowLeft } from "@/components/icons";
import { loadCategoriesForHistoryFilter } from "@/lib/categories/load-categories";
import { loadHistory } from "@/lib/money/load-money";

/**
 * Full mixed History of committed Expenses and Incomes (no Drafts).
 * Filters (kind / Category / Occurred on range) are query-only UI over the list.
 */
export default async function HistoryPage() {
  const [items, categories] = await Promise.all([
    loadHistory(),
    loadCategoriesForHistoryFilter(),
  ]);

  return (
    <div className="ui-page">
      <Link href="/" className="ui-back">
        <IconArrowLeft size={14} /> Домой
      </Link>
      <h1 className="mt-2 text-[1.55rem] font-bold tracking-[-0.04em]">История</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Расходы и доходы · по дате
      </p>
      <HistoryPanel items={items} categories={categories} />
    </div>
  );
}
