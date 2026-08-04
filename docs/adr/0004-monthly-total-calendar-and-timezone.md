# Monthly total: calendar month, Europe/Minsk, live recalc

**Monthly total** is per **calendar month** (not a rolling window): expense total, income total, and **net** (income − expense) over **committed** Expenses and Incomes whose **Occurred on** falls in that month; Drafts never count. Product calendar day and month bounds use fixed **Europe/Minsk** (BYN / single-user BY audience)—including default Occurred on when capture omits a date—not device TZ, UTC, or a per-user setting. Totals are **live**: Edit (Amount or Occurred on) and Delete recalculate affected months immediately; there is no month-close snapshot or frozen history. An empty month is zeros; the current incomplete month is the same live sum so far, not a separate “partial month” type.

## Considered options

- **Rolling 30 days** — rejected: mismatches “итог за месяц” and month-to-month comparison.
- **Attribute by Commit time** — rejected: History and mental model are Occurred on; late entry would land in the wrong month.
- **Device TZ or per-user TZ** — rejected: unstable aggregates and extra settings; travel is handled by the user choosing Occurred on as a calendar date.
- **UTC month bounds** — rejected: wrong wall-clock month for Europe/Minsk evenings.
- **Snapshot / close past months** (or block Edit on past Occurred on) — rejected for MVP: corrections must keep History and Monthly total aligned; no close workflow.
- **Special partial-month entity** — rejected: same definition as any month, just fewer committed rows so far.
