import Link from "next/link";
import type { Account } from "@/lib/accounts/types";
import { currencySymbol } from "@/lib/money/format";

type Props = {
  accounts: Account[];
  /** null = aggregate «Все счета». */
  selectedId: string | null;
  /** Href for a selection; null id = aggregate view. */
  hrefFor: (accountId: string | null) => string;
  /** Section label (aria). */
  label?: string;
};

/**
 * Account switcher for Home / Month: «Все счета» + one chip per Account.
 * Hidden while the user has a single till — there the two views coincide.
 */
export function AccountSwitcher({
  accounts,
  selectedId,
  hrefFor,
  label = "Счёт",
}: Props) {
  if (accounts.length <= 1) return null;

  return (
    <nav
      aria-label={label}
      className="-mx-4 mt-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <SwitcherChip
        href={hrefFor(null)}
        active={selectedId === null}
        label="Все счета"
      />
      {accounts.map((account) => (
        <SwitcherChip
          key={account.id}
          href={hrefFor(account.id)}
          active={account.id === selectedId}
          label={account.name}
          currency={account.currency}
        />
      ))}
    </nav>
  );
}

function SwitcherChip({
  href,
  active,
  label,
  currency,
}: {
  href: string;
  active: boolean;
  label: string;
  currency?: Account["currency"];
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-semibold tracking-[-0.01em] transition active:scale-[0.98] ${
        active
          ? "bg-ink text-white shadow-card"
          : "bg-white text-ink-muted shadow-card hover:text-ink"
      }`}
    >
      <span className="min-w-0 truncate">{label}</span>
      {currency ? (
        <span
          className={`text-[10px] font-bold ${active ? "text-white/65" : "text-ink-muted/70"}`}
        >
          {currencySymbol(currency).trim() || currency}
        </span>
      ) : null}
    </Link>
  );
}
