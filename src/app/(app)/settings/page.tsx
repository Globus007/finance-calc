import { CategoriesManage } from "@/components/categories-manage";
import { IconArrowLeft } from "@/components/icons";
import { AccountSection } from "@/components/settings/account-section";
import { FxRateSection } from "@/components/settings/fx-rate-section";
import { loadCategoriesForManage } from "@/lib/categories/load-categories";
import { getEffectiveRate } from "@/lib/fx";
import { formatActiveRateLine } from "@/lib/fx/format";
import { createClient } from "@/lib/supabase/server";
import { userFromGetUserResult } from "@/lib/supabase/session-user";
import Link from "next/link";

/**
 * Settings (ADR-0013): single scrollable page — Fx rate / Categories / Account.
 * Entry point is the gear icon on Home; the standalone categories route is gone.
 */
export default async function SettingsPage() {
  const supabase = await createClient();
  const user = userFromGetUserResult(await supabase.auth.getUser());

  const [categories, effective] = await Promise.all([
    loadCategoriesForManage(),
    getEffectiveRate(),
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

      <section aria-label="Курс доллара" className="mt-4 px-4">
        <FxRateSection
          activeLine={
            effective ? formatActiveRateLine(effective) : null
          }
          source={effective?.source ?? null}
        />
      </section>

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
