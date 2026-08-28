"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  deleteTransfer,
  editTransfer,
  type TransferResult,
} from "@/app/(app)/transfer/actions";
import { IconArrowLeft } from "@/components/icons";
import { TransferForm } from "@/components/transfer/transfer-form";
import type { Account } from "@/lib/accounts/types";
import type { RateMap } from "@/lib/fx/client";
import { formatAmountInput } from "@/lib/money/format-amount-input";
import { transferErrorMessage } from "@/lib/transfers/error-messages";
import type { Transfer } from "@/lib/transfers/types";

type Props = {
  transfer: Transfer;
  accounts: Account[];
  rates: RateMap;
  /** Injectable for tests. */
  editFn?: (
    input: Parameters<typeof editTransfer>[0],
  ) => Promise<TransferResult>;
};

/**
 * Edit / Delete surface for one committed Transfer. Saving re-fixes the rate
 * at the moment of the edit; both Accounts' Remainders recalculate live.
 */
export function TransferEdit({
  transfer,
  accounts,
  rates,
  editFn = editTransfer,
}: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onDelete() {
    if (!window.confirm("Удалить этот перевод?")) return;

    setError(null);
    startTransition(async () => {
      const result = await deleteTransfer(transfer.id);
      if (result.status === "ok") {
        router.push("/history");
        router.refresh();
        return;
      }
      setError(transferErrorMessage(result.reason));
    });
  }

  return (
    <div className="ui-page pb-10">
      <Link href="/history" className="ui-back">
        <IconArrowLeft size={14} /> История
      </Link>

      <div className="mt-2">
        <TransferForm
          accounts={accounts}
          rates={rates}
          today={transfer.movedOn}
          title="Редактирование перевода"
          redirectTo="/history"
          submitFn={(input) => editFn({ ...input, id: transfer.id })}
          initial={{
            sourceAccountId: transfer.sourceAccountId,
            targetAccountId: transfer.targetAccountId,
            amount: formatAmountInput(transfer.amount),
            movedOn: transfer.movedOn,
            note: transfer.note ?? "",
          }}
          footer={
            <button
              type="button"
              onClick={onDelete}
              disabled={isPending}
              className="w-full cursor-pointer rounded-control bg-surface-strong py-3.5 text-sm font-bold text-[#C44822] ring-1 ring-expense/30 transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Удалить перевод
            </button>
          }
        />
      </div>

      {error ? (
        <p
          role="alert"
          className="mt-3 rounded-control bg-expense-soft px-3 py-2 text-sm text-expense"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
