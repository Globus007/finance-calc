# ADR-0013: USD display, manual USD entry, and Settings surface

Date: 2026-02-15
Status: accepted
Spec: issue #83 (grilling-settled decisions in-session)

## Context

The app is BYN-only everywhere. The user thinks about big purchases in dollars,
pays in dollars sometimes, and cannot answer "how much is that in $?" without
mental math. Entering a dollar payment requires manual pre-conversion, and the
original figure is lost. There is also no single place for app-level controls:
category management hangs off the Home header.

## Decision

**Canonical BYN storage with a currency snapshot.** `expenses` and `incomes`
keep their canonical `amount` in BYN driving every aggregate (ADR-0004 monthly
sums, ADR-0012 Remainder). Additive columns `currency` ('BYN' | 'USD'),
`original_amount`, and `fx_rate` store how the record was typed; old rows read
as native BYN. Arithmetic never changes meaning.

**Conversion happens once, at Commit / Edit-save.** The typed amount converts
to canonical BYN at the effective rate resolved server-side at that moment,
rounded half-up to 2 dp. No compute-on-read conversion; historical figures
never drift when rates move. Validation stays pure: the Draft carries the
currency, validation takes the effective rate as an injected argument, limits
apply to the amount as typed.

**One FX seam (`src/lib/fx`).** Exactly two operations: `getEffectiveRate()`
(resolution order: override > fresh-enough daily cache > lazy NBRB fetch >
last cache fallback) and `setRateOverride(rate | null)`. Daily cache + override
persist per user in a new small table; the NBRB HTTP client is thin and
untested-by-design behind the seam. Server actions resolve the rate — never
components; pages precompute ready-made "≈ $" strings so components stay
presentational.

**Manual entry only.** Voice/photo/bot capture keeps producing BYN drafts;
Opening stays BYN-only. Monthly total and Remainder arithmetic is unchanged.

**Settings surface.** New `/settings` route reachable from a gear icon on Home
(replacing the categories shortcut): one scrollable page with sections Fx rate
(view active line "$1 = 3,3012 · NBRB 12.02" or "· own", set own rate, reset),
Categories (existing management component reused inline; the standalone
categories route is removed), and Account (identity read-only + sign out).

## Consequences

- Every converted figure is labeled approximate («≈») — orientation, not fact.
- Records entered in $ keep their original amount visible in History
  ("$50 · по 3,30") and reopen in Edit prefilled as $50.
- First-use with empty cache works offline via manual override from Settings.
- No rate history, no multi-currency balances, no automatic reconversion of old
  records, no scheduled refresh — lazy daily fetch only.
