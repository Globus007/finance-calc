# Remainder from a dated Opening

Home’s primary figure is live **Remainder**, not Monthly total net. The user **Set Opening** once (and may replace it): a BYN amount (≥ 0) and a calendar date; Remainder = Opening + committed Incomes − committed Expenses whose **Occurred on** is on or after that date. Until the first Set Opening, Home prompts — it does not show `0` and does not substitute month net. Opening is one row per user; unset, a journal of openings, wallets, and a Balance entity stay out of product (ADR-0002).

## Considered options

- **Treat month net as cash** — rejected: net can be negative while the user still has counted cash; it answers a different question.
- **Opening as Income / History row** — rejected: a starting position is not an inflow; History stays committed Expenses and Incomes only.
- **Persist Remainder / snapshot totals** — rejected: same stance as Monthly total (ADR-0004): compute on read.
- **SQL CHECK that date ≤ tomorrow** — rejected: “tomorrow” is Europe/Minsk “now,” app-side, same TZ policy as Occurred on (ADR-0004).
- **Allow negative Opening or unset after first write** — rejected: debt/overdraft is not a second product; Remainder must not flap between absent and present.
- **Opening via Draft / photo / voice / bot** — rejected: Opening is a manual position, not capture.
- **Show Remainder on Month** — rejected: a month view must not display today’s cash on another month.
- **Commit-time Remainder or block Commit when negative** — rejected: late History corrections stay live; capture is never gated by the cash figure.

## Consequences

- ADR-0006’s committed tables gain `openings` (amount `numeric(12,2)` CHECK `>= 0`, calendar date, owner PK). No `remainder` table. RLS: owner SELECT / INSERT / UPDATE; no DELETE.
- Set Opening is a server action, not Draft → Commit. Amount `0` is valid here and must not leak into Commit (`parseAmount` stays `> 0`).
- Opening date may be today, a past day, or tomorrow (evening recount after already logging today’s outflows); later than tomorrow is rejected in the app.
