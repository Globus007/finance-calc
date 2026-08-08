# Competitive features shortlist (do / later / never)

**Date:** 2026-08-08  
**Issue:** [#57 Grilling: Prioritized competitive shortlist (do / later / never)](https://github.com/Globus007/finance-calc/issues/57)  
**Map:** [#54 Wayfinder: Competitive features shortlist (capture + insight)](https://github.com/Globus007/finance-calc/issues/54)  
**Branch:** `research/competitive-shortlist`

**Inputs:**

- [Research: Competitive feature inventory and signature moves](https://github.com/Globus007/finance-calc/issues/55) — [`docs/research/2026-08-08-competitive-feature-inventory.md`](https://github.com/Globus007/finance-calc/blob/research/competitive-feature-inventory/docs/research/2026-08-08-competitive-feature-inventory.md)
- [Research: finance-calc capability baseline vs capture/insight](https://github.com/Globus007/finance-calc/issues/56) — [`docs/research/2026-08-08-capability-baseline-capture-insight.md`](https://github.com/Globus007/finance-calc/blob/research/capability-baseline-capture-insight/docs/research/2026-08-08-capability-baseline-capture-insight.md)

**This note is the locked product shortlist** for map #54. It is not an implementation plan or release schedule.

---

## 1. Criteria (from map charting)

1. **Effort vs delight** — low build cost, high daily capture delight  
2. **Insight without new Budget entity** — “where did money go” from History / Monthly total / categories  
3. **Domain fit** — single-user, BYN, Draft→Commit; no silent Account / Budget / Goal as “do”

**Horizon:** value order only (not dates). Independent of Telegram delivery timing.

**Insight ceiling for “do”:** no Budget / Account / Goal entities. Read-only views over committed Expenses and Incomes are in scope.

---

## 2. Locked shortlist

### Do (value order)

| Order | Feature | One-line rationale |
|------:|---------|-------------------|
| 1 | **Month switcher** (browse past calendar months on Month surface) | Domain + `loadMonthMoney` already support it; UI gap; unlocks any month-scoped insight. Effort low, domain fit perfect. |
| 2 | **Category breakdown** for a month (list / bars / % of expense total) | Market commodity for “where did money go”; pure aggregation of committed Expenses by Category — no Budget entity. |
| 3 | **History filters** (Expense/Income, Category, date range) | Cheap navigation/insight over existing History; reduces friction to find patterns without new domain types. |
| 4 | **Amount-first manual capture** (fewer taps: amount → category → Commit) | Market signature (Monefy / Expenses OK); manual channel is weaker than photo/voice today — capture delight. |

**Note on Home “top categories”:** same data as (2); ship as part of category-breakdown work (Home snippet optional), not a fifth independent “do”.

### Later

| Feature | One-line rationale |
|---------|-------------------|
| **Spend pace** (spent ÷ day-of-month; optional extrapolation) | Free-money-adjacent insight without Budget; only after structured month/category views exist. **Not** full “safe to spend” with planned obligations. |
| **CSV export** of committed History | Useful commodity; low capture delight; no domain risk. |
| **Recurring / reminders** | Market commodity; new lifecycle and notifications; effort↑ after core insight. |
| **PWA / home-screen widget capture** | Strong market signature; platform-heavy (install surface, OS widgets). |
| **AI chat Q&A over ledger** (“where did money go in May?”) | Signature elsewhere; defer until structured insight (month + category) is solid so answers have UI ground truth. |

### Never (for this product shape / until explicit domain expansion)

| Feature | One-line rationale |
|---------|-------------------|
| **Bank SMS parse / open banking sync** | Map out-of-scope as a goal; automation-first repositioning; high compliance/geo cost. |
| **Multi-account / transfers / double-entry / net worth** | Money-manager shape; conflicts capture-first positioning and CONTEXT non-goals. |
| **Family multi-user** | Product is single-user. |
| **Goals / formal Budget entity** | Explicit “do” ceiling; revisit only with a separate domain expansion. |
| **Receipt gallery / retained media** | Conflicts ephemeral Receipt/Recording lifecycle (ADR-0005). |

### Outside this shortlist (not never for the product)

| Item | Note |
|------|------|
| **Telegram Mini App + bot capture** | Owned by [Wayfinder: Telegram surface (Mini App + chat capture)](https://github.com/Globus007/finance-calc/issues/43) — channel map, not this capability shortlist. |

---

## 3. Domain impact of “do”

| Do item | New domain entity? | Notes |
|---------|-------------------|--------|
| Month switcher | No | Still Monthly total + Occurred on; UI over existing calendar month. |
| Category breakdown | No | Derived view: sum Expense Amounts by Category for a month. Display name only for UI. |
| History filters | No | Query/filter over History; no new types. |
| Amount-first manual | No | Same Draft fields; UX order / defaults only. |

No CONTEXT glossary changes required to lock this shortlist. If implementation later invents a user-facing name that collides with avoided terms (“budget”, “balance”), challenge it in domain-modeling at build time.

---

## 4. Post-map handoff (not decided here)

Creating `ready-for-agent` issues, PRD shape, or prototypes for amount-first UX is **after** this map. Suggested default: one implementation issue per “do” row in value order, starting with month switcher.

---

## 5. Resolution log

- Charted on map #54 with criteria and scope above.  
- Grilling #57: user confirmed recommended buckets and insight-first order (`all ok`, 2026-08-08).  
- Map destination = this shortlist locked.

*End of shortlist. No product implementation in this artifact.*
