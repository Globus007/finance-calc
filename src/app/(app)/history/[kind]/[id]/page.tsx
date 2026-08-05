import { notFound } from "next/navigation";
import { EditRecord } from "@/components/edit-record";
import { loadEditRecord } from "@/lib/money/load-edit-record";

type PageProps = {
  params: Promise<{ kind: string; id: string }>;
};

/**
 * Edit / Delete surface for one committed Expense or Income from History.
 * Channel and kind stay immutable after Commit.
 */
export default async function EditHistoryRecordPage({ params }: PageProps) {
  const { kind, id } = await params;
  const data = await loadEditRecord(kind, id);
  if (!data) notFound();

  return (
    <EditRecord record={data.record} categories={data.categories} />
  );
}
