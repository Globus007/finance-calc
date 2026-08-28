# ADR-0014: Multi-account, multi-currency Accounts with Transfers

Date: 2026-08-27
Status: accepted
Spec: issue #85 (grilling-settled decisions in-session, rounds Q1–Q20)

## Context

The app is a single BYN till: one Opening, one Remainder, one set of monthly
totals. Real users keep money in several places and currencies — BYN cash, USD
on a card, EUR in a savings account. Paying from the USD card forces a manual
pre-conversion that loses the original figure, and moving money between own
places can only be recorded as a fake income or expense, which corrupts both
Monthly totals and Remainder.

ADR-0013 already established the two properties this decision depends on:
canonical BYN storage with a native snapshot fixed at Commit, and one FX seam
that resolves an effective rate lazily per day with a manual override.

## Decision

**Accounts are first-class named tills, each with one fixed Currency.**
`accounts (owner_id, name, currency ∈ {BYN, USD, EUR}, is_default)`. Currency is
chosen at creation and never changed afterwards — changing it would silently
re-label every existing record in the till. Every committed Expense and Income
names exactly one Account via `account_id` (`on delete restrict`, NOT NULL after
backfill), so a till with records cannot be deleted. Exactly one Account per
owner is the default (partial unique index); the first Account of an owner is
always the default, and deleting the default promotes another. At least one
Account always exists (delete trigger). New users get «Наличные» (BYN, default)
from the same `auth.users` insert trigger that seeds Categories; existing data
migrates to it.

**Currency is a property of the Account, not of the record's form.** There is no
per-record currency picker: the Amount is typed in the Account's Currency, and a
DB trigger keeps `expenses.currency` / `incomes.currency` equal to their
Account's Currency. The ADR-0013 snapshot columns stay exactly as they are
(`currency`, `original_amount`, `fx_rate`), only widened to accept EUR.

**Canonical BYN storage is preserved.** Conversion still happens once, at Commit
and at Edit-save, at the effective rate for that Currency; per-Account figures
are computed from the native snapshot and are exact in the Account's Currency;
cross-Account figures are computed at read from the current rate and are always
labeled «≈». Per-record history never re-converts.

**Opening and Remainder become per-Account.** `openings` is keyed
`(owner_id, account_id)` and its amount is in the Account's Currency. Per-Account
Remainder is exact in that Currency (Opening + Incomes − Expenses ± Transfers
on or after the Opening date); the all-Account figure is a BYN aggregate at
read («≈»). An Account without an Opening has no Remainder (absent, not zero),
and contributes nothing to the aggregate.

**Monthly totals become per-Account**, exact in the Account's Currency, plus one
BYN «≈» aggregate line. Transfers are excluded from Monthly totals and from the
aggregate, so a move never changes total wealth.

**Transfers are a third History kind, not a pair of records.**
`transfers (owner_id, source_account_id, target_account_id, amount,
converted_amount, fx_rate, moved_on, note)` — Amount typed in the source
Currency, converted once at the rate effective at the moment of the move, with
the implied source→target rate stored on the row. `source <> target` is a DB
check; both FKs are `on delete restrict`. A Transfer is a direct user action:
manual only, no Draft → Commit pipeline, no bot capture, no Channel. Edit and
Delete recalculate both Accounts' Remainders. A Note/date-only Edit keeps the
rate fixed at the move. No balance check — Remainder may go negative.

**FX generalizes per Currency rather than adding a second seam.** `fx_rates` is
keyed `(owner_id, currency)` with currency ∈ {USD, EUR}; `getEffectiveRate()`
and `setRateOverride()` take the Currency. Same resolution order (override >
fresh daily cache > lazy NBRB > stale cache), same TTL, same per-Currency
override. A cross-Currency Transfer derives its rate from the two BYN rates
(`rate_source→BYN / rate_target→BYN`), so BYN↔USD, BYN↔EUR and USD↔EUR all work
without a third rate row.

**Capture stays one-step.** Photo, voice, and bot Commit to the default Account
(no picker on those surfaces); manual capture shows an Account picker on confirm.
Settings gains an Accounts section: list, create, rename, delete-only-when-empty,
choose default.

## Consequences

- Per-Account figures are honest in their own Currency; every mixed figure is
  visibly approximate, which is the price of a single-number overview.
- The default Account is a routing rule for fast capture, not a container for
  misfiled records: manual capture always names an Account explicitly.
- Widening `openings` to a composite PK and `fx_rates` to per-Currency rows is a
  rewrite of those tables inside one migration; both are small and fully
  backfilled from existing rows.
- Transfer conversion is fixed at the moment of the move, so a later rate change
  never rewrites history — and never re-balances the two Accounts either.
- Out of scope by design: changing an Account's Currency, hiding Accounts,
  balance checks on Transfer, Transfers in the bot, rate history / charts /
  scheduled refresh, per-Draft currency picker, portfolio tracking beyond
  Remainder, any change to Categories or the extraction pipeline.
