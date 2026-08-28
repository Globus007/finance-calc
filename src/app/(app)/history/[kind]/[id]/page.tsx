import { notFound } from "next/navigation";
import { EditRecord } from "@/components/edit-record";
import { TransferEdit } from "@/components/transfer/transfer-edit";
import { loadEditRecord } from "@/lib/money/load-edit-record";
import { loadTransferForEdit } from "@/lib/transfers/load-transfer";

type PageProps = {
  params: Promise<{ kind: string; id: string }>;
};

/**
 * Edit / Delete surface for one committed record from History:
 * Expense | Income (Channel and kind stay immutable) or Transfer.
 */
export default async function EditHistoryRecordPage({ params }: PageProps) {
  const { kind, id } = await params;

  if (kind === "transfer") {
    const transfer = await loadTransferForEdit(id);
    if (!transfer) notFound();
    return <TransferEdit {...transfer} />;
  }

  const data = await loadEditRecord(kind, id);
  if (!data) notFound();

  return (
    <EditRecord
      record={data.record}
      categories={data.categories}
      accounts={data.accounts}
      rates={data.rates}
    />
  );
}
