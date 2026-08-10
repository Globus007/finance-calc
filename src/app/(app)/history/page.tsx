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
    <div className="px-4 pb-4 pt-3">
      <Link
        href="/"
        className="flex items-center gap-1 text-xs font-semibold text-[#5B6CFF]"
      >
        <IconArrowLeft size={14} /> Домой
      </Link>
      <h1 className="mt-2 text-2xl font-bold tracking-tight">История</h1>
      <p className="mt-1 text-sm text-[#1A1B2E]/45">
        Расходы и доходы · по дате
      </p>
      <HistoryPanel items={items} categories={categories} />
    </div>
  );
}
