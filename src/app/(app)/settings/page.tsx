import { CategoriesManage } from "@/components/categories-manage";
import { IconArrowLeft } from "@/components/icons";
import Link from "next/link";
import { AccountSection } from "@/components/settings/account-section";
import { AccountsManage } from "@/components/settings/accounts-manage";
import { FxRateSection } from "@/components/settings/fx-rate-section";
import { listAccounts } from "@/lib/accounts/load-accounts";
import { loadCategoriesForManage } from "@/lib/categories/load-categories";
import { getEffectiveRate, RATE_CURRENCIES } from "@/lib/fx";
import { formatActiveRateLine } from "@/lib/fx/format";
import { createClient } from "@/lib/supabase/server";
import { userFromGetUserResult } from "@/lib/supabase/session-user";

/**
 * Settings (ADR-0013 / ADR-0014): Fx rates per Currency / Accounts / Categories.
 * Entry point is the gear icon on Home.
 */
export default async function SettingsPage() {
  const supabase = await createClient();
  const user = userFromGetUserResult(await supabase.auth.getUser());

  const [categories, accounts, rateEntries] = await Promise.all([
    loadCategoriesForManage(),
    listAccounts(),
    Promise.all(
      RATE_CURRENCIES.map(async (currency) => {
        const effective = await getEffectiveRate(currency);
        return {
          currency,
          effective,
          activeLine: effective ? formatActiveRateLine(currency, effective) : null,
          source: effective?.source ?? null,
        };
      }),
    ),
  ]);

  return (
    <div className="ui-page pb-12">
      <div className="px-4 pt-3">
        <Link href="/" className="ui-back">
          <IconArrowLeft size={14} /> Назад
        </Link>
      </div>

      <header className="mt-2 px-4">
        <h1 className="text-[1.55rem] font-bold tracking-[-0.04em]">
          Настройки
        </h1>
      </header>

      <section aria-label="Счета" className="mt-4 px-4">
        <AccountsManage accounts={accounts} />
      </section>

      {rateEntries.map(({ currency, activeLine, source }) => (
        <section
          key={currency}
          aria-label={`Курс ${currency === "USD" ? "доллара" : "евро"}`}
          className="mt-6 px-4"
        >
          <FxRateSection
            currency={currency}
            activeLine={activeLine}
            source={source}
          />
        </section>
      ))}

      <section aria-label="Категории" className="mt-6 border-t border-line pt-4">
        <CategoriesManage initialCategories={categories} />
      </section>

      <section
        aria-label="Аккаунт"
        className="mt-6 border-t border-line px-4 pt-4"
      >
        <AccountSection email={user?.email ?? null} />
      </section>
    </div>
  );
}