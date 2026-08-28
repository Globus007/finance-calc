import Link from "next/link";
import { IconArrowLeft } from "@/components/icons";
import { TransferForm } from "@/components/transfer/transfer-form";
import { listAccounts } from "@/lib/accounts/load-accounts";
import { todayInMinsk } from "@/lib/dates/minsk-today";
import { getEffectiveRates } from "@/lib/fx";
import { createClient } from "@/lib/supabase/server";
import { userFromGetUserResult } from "@/lib/supabase/session-user";

/**
 * Transfer capture: a direct user action between own Accounts (ADR-0014).
 * Manual only — no Draft, no bot, and never income or expense.
 */
export default async function TransferPage() {
  const supabase = await createClient();
  const user = userFromGetUserResult(await supabase.auth.getUser());
  if (!user) {
    return (
      <div className="ui-page">
        <Link href="/login" className="ui-back">
          <IconArrowLeft size={14} /> Назад
        </Link>
        <p className="ui-empty mt-4">Войдите, чтобы записать перевод.</p>
      </div>
    );
  }

  const [accounts, rates] = await Promise.all([
    listAccounts(),
    getEffectiveRates(),
  ]);

  return (
    <div className="ui-page pb-10">
      <Link href="/history" className="ui-back">
        <IconArrowLeft size={14} /> История
      </Link>

      <h1 className="mt-2 text-[1.55rem] font-bold tracking-[-0.04em]">
        Перевод между счетами
      </h1>
      <p className="mt-1 text-sm text-ink-muted">
        Деньги между своими счетами: это не доход и не расход, в итогах месяца
        перевод не участвует.
      </p>

      <div className="mt-5">
        <TransferForm
          accounts={accounts}
          rates={rates}
          today={todayInMinsk()}
          title="Перевод между счетами"
        />
      </div>
    </div>
  );
}
