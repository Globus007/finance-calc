# ADR-0014: Accounts in their own currencies, with Transfers between them

Date: 2026-08-27
Status: accepted
Spec: issue #85 (grilling-settled decisions in-session)

## Context

The app is a single till: one BYN Opening, one Remainder, and every Expense/Income in canonical BYN (ADR-0012, ADR-0013). The user actually keeps money in several places and in different currencies and wants to track each place in its own currency, plus move money between them. ADR-0013 explicitly deferred "multi-currency accounts, wallets, or balances"; this decision reverses that and replaces the «single till» positioning.

## Decision

**Accounts.** A named till with one Currency fixed at creation (BYN, USD, or EUR). Every committed Expense and Income belongs to exactly one Account; a Transfer belongs to two (source and target). Opening, Remainder, and Monthly totals are per-Account. Accounts can be created and renamed; an Account can be deleted only when no committed record references it, and at least one Account always exists. The default Account receives fast capture (photo/voice/bot); manual capture chooses explicitly. Existing single-till data auto-migrates to a default BYN Account «Наличные»; new users get the same default.

**Currencies.** Fixed set {BYN, USD, EUR}. Currency is fixed at Account creation — changing Currency means a new Account, never a re-conversion of history.

**Storage.** Canonical BYN storage is preserved (ADR-0013 generalized): every record converts once at Commit/Edit-save at the effective Fx rate and keeps a native snapshot (Currency, original Amount, rate). Per-account figures use native snapshots (exact); cross-account aggregates convert per-Account figures to BYN at read and are labeled approximate («≈»). The FX seam generalizes to effective USD→BYN and EUR→BYN rates (NBRB, lazy daily cache, per-currency override).

**Transfers.** A source → target move between own Accounts: Amount in the source Account's Currency, converted to the target at the effective rate at the moment of the move, with Occurred on and optional Note. A committed Transfer is History's third kind; it changes no Monthly total and no cross-account aggregate (own money moving between own Accounts changes no totals). Manual only, not Draft → Commit; Edit/Delete recalculate both Accounts' Remainders live. Validation: Amount > 0, source ≠ target, no balance check (a source Remainder may go negative).

**Aggregates.** All cross-account figures are BYN and approximate («≈»): the Home Remainder aggregate and the Month cross-account line. The aggregate is absent until at least one Account has an Opening; Accounts without an Opening are excluded.

**Edit.** Changing an Account on a record: same Currency leaves the Amount unchanged; a different Currency prefills the converted Amount («≈») for confirmation or adjustment.

**Surfaces.** Account management lives in Settings (create/rename/delete, default choice); per-Account Set Opening on the Account card on Home.

## Consequences

- The «single till» positioning (PRODUCT.md) is deliberately replaced by a multi-account model; CONTEXT.md gains Account and Transfer and per-account semantics, and drops the per-Draft Currency picker and the "no multi-currency" constraints.
- Records keep commit-time canonical BYN, so per-record history never re-converts; only cross-account aggregates convert at read, always labeled «≈».
- ADR-0013's USD-only snapshot generalizes to EUR; its "no multi-currency accounts" and "no compute-on-read" stances are superseded for aggregates (recorded figures still never re-convert).
- Voice/photo/bot capture targets the default Account and so needs no new capture affordance; the bot stays Expense-only and gets no Transfers.
- Transfers are deliberately excluded from Monthly totals and the aggregate; there is no balance check.
