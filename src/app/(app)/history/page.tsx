import Link from "next/link";
import { HistoryList } from "@/components/history-list";
import { IconArrowLeft } from "@/components/icons";
import { loadHistory } from "@/lib/money/load-money";

/**
 * Full mixed History of committed Expenses and Incomes (no Drafts).
 */
export default async function HistoryPage() {
  const items = await loadHistory();

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
      <HistoryList items={items} />
    </div>
  );
}
