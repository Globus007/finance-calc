# Simple income shape and capture

MVP Income is deliberately narrower than Expense: Channels are **voice** and **manual** only (no photo/Receipt); each Income Draft holds **exactly one** prospective Income; Commit requires **Amount** + **Occurred on**, with optional **Note** (free-text source/context—no Income Category or typed Source) and system-set **Channel**. Expense Drafts are also one prospective Expense per Draft (see ADR-0003). Manual capture uses an explicit Income vs Expense entry; voice extraction **proposes** the Draft target, and the user may **switch** Expense↔Income before Commit: Expense→Income drops Category and keeps Amount / Occurred on / Note; Income→Expense yields one Expense Draft without Category until the user sets one. Missing date defaults **Occurred on** to the calendar **today in Europe/Minsk** (usable Draft, not Extraction failure; product TZ, not device local—see ADR-0004); missing Amount still opens confirm for the user to fill (pipeline success ≠ Extraction failure). **History** is one mixed list (Expense + Income) by Occurred on. **Monthly total** includes expense total, income total, and **net** (income − expense) as a derived figure (month bounds and live recalc in ADR-0004). No Transfer/Refund types—cashback/returns may be Income at user judgment; own-account transfers out of scope.

## Considered options

- **Photo for Income / full channel parity** — rejected: no Receipt semantics for inflows; vision scope stays Expense-only.
- **Multi-record Income Draft** — rejected: breaks “simple income”; multiple inflows are separate Draft → Commit cycles.
- **Income Category or required Source type** — rejected: second taxonomy; optional Note is enough for MVP.
- **User always picks type before voice** — rejected in favor of voice auto-classify + confirm-time switch (manual stays explicit).
- **Type locked after extract** — rejected: misclassify would force Discard + recapture.
- **Monthly total without net / net-only** — rejected: three figures keep transparency without a separate Balance entity.
- **Separate expense vs income History** — rejected: one mixed list is the default mental model.
- **Transfer/Refund as first-class types or negative Expense** — rejected for MVP; keeps Amount > 0 and two record kinds only.
