# Amount-first manual capture — tap count (issue #61)

Happy-path **Expense** Commit (Amount typed, Category chosen, default today date, empty Note). Keyboard entry of the amount is counted as typing, not taps.

## Before

| Step | Interaction |
|-----:|-------------|
| 1 | Tap pen (dock «Вручную») |
| 2 | Full screen: tap «Расход» |
| 3 | Focus Amount (manual) |
| 4 | Type Amount |
| 5 | Open Category `<select>` |
| 6 | Pick Category option |
| 7 | Tap «Сохранить» |

**Screens:** type picker + confirm (2). **Taps (excluding typing):** 5 (pen, kind, select open, option, commit).

## After

| Step | Interaction |
|-----:|-------------|
| 1 | Tap pen → confirm opens (Expense default; Amount focused) |
| 2 | Type Amount |
| 3 | Tap Category chip (one-tap visible list) |
| 4 | Tap «Сохранить» |

**Screens:** confirm only (1; brief loading while categories fetch). **Taps (excluding typing):** 3 (pen, category chip, commit).

Income: switch «Доход» on the same confirm (+1 tap vs Expense default); no Category step. Occurred on stays product today (Europe/Minsk) unless edited — optional Date/Note edits are unchanged secondary fields.
