"use client";

import { useTransition } from "react";
import { signOut } from "@/app/(app)/settings/actions";

type Props = {
  /** Read-only identity of the current session. */
  email: string | null;
};

/** Account section: identity read-only + the app's only sign-out control. */
export function AccountSection({ email }: Props) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="rounded-2xl bg-white p-4 shadow-card">
      <p className="ui-kicker">Аккаунт</p>
      <p className="mt-1 truncate text-sm font-semibold text-ink" data-testid="account-email">
        {email ?? "—"}
      </p>

      <button
        type="button"
        onClick={() => startTransition(async () => void (await signOut()))}
        disabled={isPending}
        className="mt-3 w-full cursor-pointer rounded-control bg-surface-strong py-3 text-sm font-bold text-expense ring-1 ring-expense/30 transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
      >
        {isPending ? "Выходим…" : "Выйти"}
      </button>
    </div>
  );
}
