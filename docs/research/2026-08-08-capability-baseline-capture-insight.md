# Research: finance-calc capability baseline vs capture / insight

**Date:** 2026-08-08  
**Ticket:** [#56](https://github.com/Globus007/finance-calc/issues/56) (part of Wayfinder map [#54](https://github.com/Globus007/finance-calc/issues/54))  
**Scope:** As-is product capabilities for capture, history, categories, and monthly insight; gap matrix vs common market feature themes.  
**Sources:** `CONTEXT.md`, `docs/adr/`, `README.md`, `src/`, `supabase/`, `prototype-screen-map/` (throwaway).  
**Out of scope:** do/later/never prioritization, competitive shortlist, implementation design.

**Status legend for gap matrix**

| Status | Meaning |
|--------|---------|
| **Covered** | Shipped in production app code + domain docs |
| **Partial** | Present in a limited form, decided in ADR only (not shipped), or core path exists without common market depth |
| **Absent** | Not in domain model, schema, or UI; may be intentional non-goal |

---

## 1. Executive summary

**What finance-calc is today**

A **single-user personal finance capture** product: record **Expenses** (with category) and simple **Incomes** in **BYN**, through a **Capture → Draft → Commit | Discard** loop, then review **History** and a live **Monthly total** (expense total, income total, net) for the **current calendar month** in **Europe/Minsk**.

Shipped surfaces (Next.js App Router + Supabase Auth/Postgres/Storage + AI extract):

| Surface | Role |
|---------|------|
| Home `/` | Current-month net card + last 5 committed History rows; link to categories & full history |
| Capture dock | Photo · **voice (primary)** · manual → confirm |
| History `/history` | Full mixed Expense+Income list; edit/delete per row |
| Month `/month` | Live monthly totals + simple income/expense bars for **current** month only |
| Categories `/categories` | Manage seed + user-defined Categories |
| Login | Email + 6-digit OTP (`shouldCreateUser: false`) |
| PWA | Installable manifest; **online-first** (no service worker / offline queue) |

**What it is not**

Not a full money manager: **no Account / Budget / Goal / Transfer / Refund** domain types, **no multi-currency**, **no bank sync**, **no family multi-user product UX**, **no export**, **no recurring automation**, **no receipt archive**. Vocabulary deliberately avoids “Balance” and “Budget” as product concepts (`CONTEXT.md` Monthly total / Category). Telegram Mini App + bot capture are **decided in ADR-0009 / ADR-0010** but **not implemented in `src/`** as of this baseline (implementation belongs to the separate Telegram surface map).

**Positioning vs market themes**

Strength is **low-friction multimodal capture** (receipt photo + voice STT/LLM + manual) with a **strict confirm step** and **ephemeral media**, plus **correct live monthly nets** over committed data. Insight beyond current-month net + mixed history is thin (no category breakdown, month switcher, filters, or charts). Many common competitor features are **absent by design** or still research-only.

---

## 2. Capability inventory (as implemented)

Citations point at primary sources. “Shipped” means code under `src/` / `supabase/` on `main` at research time.

### 2.1 Domain model (vocabulary)

Defined in root [`CONTEXT.md`](../../CONTEXT.md):

| Concept | Summary |
|---------|---------|
| **Expense** | Outflow; Amount, Occurred on, Category required; optional Note, Channel |
| **Income** | Inflow; Amount, Occurred on required; optional Note, Channel; **no Category / Source type** |
| **Draft** | In-flight confirm only (not persisted); one prospective Expense **or** Income |
| **Commit / Discard** | Create one record or abandon Draft; failed Commit keeps Draft on confirm |
| **Category** | Expense labels only; seed + user-defined; Hide/Unhide; System fallback «Прочее» |
| **Amount** | Always BYN, > 0 on commit |
| **Occurred on** | Calendar date; product “today” = **Europe/Minsk** |
| **Channel** | `photo` \| `voice` \| `manual`; system-set; stored; not edited on confirm |
| **Receipt / Recording** | Ephemeral capture inputs |
| **History** | Single mixed list of committed Expenses + Incomes |
| **Monthly total** | Expense sum, income sum, **net** (income − expense) for a calendar month; live recalc |

Explicit type absences in CONTEXT: **Transfer**, **Refund** as domain types; own-account moves out of scope; cashback/returns may be logged as Income at user judgment (ADR-0002).

### 2.2 Capture channels

| Channel | Expense | Income | Prefill | Implementation anchors |
|---------|---------|--------|---------|------------------------|
| **Photo (Receipt)** | Yes | No | Vision LLM → Amount, date, Category, Note; grand total only | `src/lib/capture/run-photo-pipeline.ts`, `src/lib/extract/vision-receipt.ts`, `src/app/(app)/capture/photo-actions.ts`, ADR-0005, ADR-0007 |
| **Voice (Recording)** | Yes | Yes | STT → text extract; kind proposed; user may switch Expense↔Income on confirm | `run-voice-pipeline.ts`, `stt.ts`, `voice-transcript.ts`, `voice-actions.ts`, ADR-0002 |
| **Manual** | Yes | Yes | Empty Amount; today Occurred on; Expense Category empty until pick; explicit type pick | `create-manual-draft.ts`, `ManualTypePicker`, `commitDraft` |

**Dock IA (shipped):** bottom bar Домой | photo · **big mic** · manual | Месяц (`bottom-nav.tsx`). Matches prototype verdict in `prototype-screen-map/PROTOTYPE.md` (variant A + C dock).

**Limits (ephemeral path):** photo ≤ 5 MB JPEG/PNG/WebP (client compress); voice ≤ ~60 s / ≤ 2 MB (ADR-0005, `photo-limits.ts`, `voice-limits.ts`).

**Media lifecycle:** signed upload → private temp Storage → server extract → **delete** object; confirm has **no** thumbnail/playback; Extraction failure → **recapture only** (ADR-0005, ADR-0008).

**Draft confirm (one shape all channels):**

| Draft | Editable fields | Not on form |
|-------|-----------------|-------------|
| Expense | Amount, Occurred on, Category, Note | Channel |
| Income | Amount, Occurred on, Note | Category, Channel |

- No per-field confidence UI (ADR-0003).
- No multi-line / multi-item Draft; receipt = grand total; multi-mention voice = primary record only.
- Voice kind switch: Expense→Income drops Category; Income→Expense clears Category (`confirm-draft.tsx`).
- Commit server forces Channel from path (`commitDraft` / `commitPhotoDraft` / `commitVoiceDraft` in `capture/actions.ts`); client cannot forge provenance.
- Draft is **client-only** (no `drafts` table — ADR-0006).

**Failure UX (shipped):** pre-capture vs Extraction failure on capture shell; cancel mid-extract; Commit fail stays on confirm (ADR-0008, shells + `messages.ts`).

### 2.3 Categories lifecycle

ADR-0001 + `src/lib/categories/*` + `categories/actions.ts` + seed trigger in migrations.

| Capability | Status |
|------------|--------|
| 13 seed Categories (RU names; «Прочее» system fallback) | Shipped (DB trigger on user insert) |
| User create Category | Shipped |
| Rename user-defined | Shipped |
| Hide / Unhide (non-fallback seed + user) | Shipped |
| Hard-delete user-defined only if no Expense uses them | Shipped |
| Seed rename / seed delete | Forbidden (app lifecycle) |
| System fallback hide/rename/delete | Forbidden |
| Auto-classify creates Categories | **Never** (maps to visible ids or «Прочее») |
| User reorder | **No** (seed order + A–Я user) |
| Income categories | **No** |

### 2.4 History

| Capability | Status | Notes |
|------------|--------|-------|
| Mixed Expense + Income list | Covered | `mergeHistory` by Occurred on DESC, then `createdAt` |
| Home recent (5) + full `/history` | Covered | `loadHomeMoney` / `loadHistory` |
| Row shows kind, amount, date, note/category, channel label | Covered | `history-list.tsx` |
| Edit committed fields | Covered | Amount, Occurred on, Note; Category for Expense; **not** Channel/kind |
| Delete committed (hard) | Covered | `history/actions.ts` |
| Filter / search / date range UI | Absent | Load all for authenticated user |
| Separate expense-only or income-only history default | Absent (intentional) | CONTEXT |

### 2.5 Monthly insight

| Capability | Status | Notes |
|------------|--------|-------|
| Expense total, income total, net for calendar month | Covered | `computeMonthlyTotal`; ADR-0004 |
| Europe/Minsk month bounds & “today” | Covered | `minsk-month.ts`, `minsk-today.ts` |
| Live recalc after Edit/Delete | Covered | revalidate home/history/month; no snapshot table |
| Home net card | Covered | `MonthlyTotalCard` without bars |
| Month tab net + simple income/expense bars | Covered | `showBars` on `/month` |
| Month switcher (past/future months) | **Partial** | `loadMonthMoney(yearMonth)` + `shiftYearMonth` exist; **UI only loads current month** (`month/page.tsx`) |
| Category / channel breakdown | Absent | |
| Charts beyond two bars | Absent | |
| Budgets, limits, “left to spend” | Absent | |
| Year / multi-month comparison | Absent | |

### 2.6 Auth, multi-tenancy, platform

| Capability | Status | Notes |
|------------|--------|-------|
| Email OTP login | Covered | `login/actions.ts`; magic link secondary path |
| Single-user provisioned account | Covered | `shouldCreateUser: false` |
| RLS by `owner_id` | Covered | ADR-0006; multi-row isolation ready |
| Multi-user product (family, roles) | Absent | |
| Self-serve signup | Absent | Ops creates user |
| Telegram identity link + silent Mini App session | **Partial (ADR only)** | ADR-0009; no `src` bot/Mini App session code on main |
| Telegram bot photo/voice + in-chat confirm | **Partial (ADR only)** | ADR-0010 |
| PWA install | Covered | `manifest.ts` |
| Offline capture queue | Absent | Explicit non-goal in manifest comment / ADR-0008 |

### 2.7 Persistence schema (committed only)

Tables: `categories`, `expenses`, `incomes` (ADR-0006). No currency column; no media tables; no monthly_totals snapshots; no accounts/budgets/goals/recurring.

### 2.8 Prototype (non-production)

`prototype-screen-map/` is throwaway mock UI that **locked IA** (dashboard home + voice-first dock). Not a second product surface.

---

## 3. Domain non-goals and intentional absences

From `CONTEXT.md`, ADRs, README, and schema:

| Non-goal / absence | Source |
|--------------------|--------|
| “Budget”, “Balance” as domain names for monthly insight | CONTEXT Monthly total / Category avoid lists |
| Transfer / Refund as first-class types | CONTEXT Income; ADR-0002 |
| Income Category or typed Source | CONTEXT; ADR-0002 |
| Multi-item Draft / line items / multi-Commit | ADR-0003 |
| Deferred incomplete Draft list / `drafts` table | ADR-0003, ADR-0006 |
| Long-term receipt/recording archive or confirm media | ADR-0005 |
| Retry same media after Extraction failure | ADR-0005, ADR-0008 |
| Per-field confidence flags | ADR-0003, ADR-0007 |
| Multi-currency / FX conversion | Amount always BYN; ADR-0007 |
| Device TZ or per-user TZ for month bounds | ADR-0004 |
| Month-close snapshots / frozen months | ADR-0004 |
| Soft-delete of committed records | ADR-0006 |
| Offline queue / background extract | ADR-0008; manifest |
| LLM may invent Categories | ADR-0001, ADR-0007 |
| Self-serve Telegram link UI (MVP) | ADR-0009 |
| Free-text NL as capture path in Telegram bot | ADR-0010 |
| Full money-manager repositioning | Map #54 positioning (external to domain, aligns with thin insight surface) |

**Speculation (not in domain docs):** competitive apps often brand “balance” as cash-on-hand across accounts; finance-calc net is **period flow**, not wallet balance. Marked speculation.

---

## 4. Gap matrix: common market themes

Themes are **common personal-finance app inventory** items (capture-first + insight + money-manager extras). Competitive research file may not yet be merged; matrix still usable for gap analysis. Status relative to **shipped product** unless noted.

| Market theme | Status | Notes |
|--------------|--------|-------|
| **Manual expense entry** | Covered | Manual channel + confirm |
| **Manual income entry** | Covered | Same; simpler fields |
| **Receipt photo OCR / AI** | Covered | Vision extract → Expense Draft; grand total; ephemeral media |
| **Voice capture** | Covered | STT + structured extract; primary dock affordance |
| **Draft / confirm before save** | Covered | Commit \| Discard; one record per cycle |
| **Expense categories** | Covered | Seed + custom; hide; fallback «Прочее» |
| **Category management UI** | Covered | `/categories` |
| **Transaction history list** | Covered | Mixed History; edit/delete |
| **Monthly income/expense/net summary** | Covered | Home + Month; Europe/Minsk |
| **Simple visual summary (bars)** | Partial | Month tab two bars only; no trends |
| **Past month browsing** | Partial | Domain + loader support; **no UI switcher** |
| **Category spend breakdown / pie** | Absent | Strong candidate area for “insight on existing data” (not built) |
| **Filters / search on history** | Absent | |
| **Multi-account / wallets** | Absent | Intentional; no Account entity |
| **Budgets / monthly limits / envelopes** | Absent | Intentional ceiling in map #54 until domain expansion |
| **Goals / savings targets** | Absent | |
| **Recurring transactions** | Absent | |
| **Bank / open banking sync** | Absent | Map #54 out-of-scope as goal |
| **CSV / Excel export / import** | Absent | |
| **Multi-currency** | Absent | BYN-only intentional |
| **Multi-user / family shared budget** | Absent | Single-user product; RLS multi-owner-ready only |
| **Notifications / reminders** | Absent | |
| **Tags** (beyond Category) | Absent | Category is the only classifier |
| **Merchant database** | Absent | Merchant folds into Note |
| **Transfers between accounts** | Absent | Explicit non-goal |
| **Refunds as first-class type** | Absent | May log as Income |
| **Receipt image gallery** | Absent | Ephemeral by design |
| **Offline capture** | Absent | Online-first |
| **Widgets / watch / share sheet** | Absent | PWA install only |
| **Telegram / messenger capture** | Partial | **ADR-0009/0010 decided**; not shipped in app code |
| **Chatbot / NL free-text capture (web)** | Absent | Manual form fields, not free-text NL |
| **Confidence scoring on AI fields** | Absent | Intentional |
| **Investment / portfolio tracking** | Absent | Out of product shape |
| **Double-entry accounting** | Absent | |
| **Reports / PDF statements** | Absent | |
| **Dark mode / theme settings** | Absent | Fixed light UI (observation; not a domain concern) |
| **Auth (email magic/OTP)** | Covered | Single pre-provisioned user |
| **Cloud sync (own backend)** | Covered | Supabase per-user rows |

---

## 5. Capture & insight strengths (descriptive)

### Capture strengths

1. **Three channels with one confirm contract** — photo/voice/manual differ by prefill and media, not by a second data model (ADR-0003). Reduces learning cost vs channel-specific wizards.
2. **Voice-first IA** — large mic in dock; aligns prototype verdict with daily friction for BY-audience spoken amounts.
3. **AI assist without auto-commit** — extraction never silently posts History; user always Commits or Discards.
4. **Ephemeral media privacy/cost story** — no receipt gallery product surface; Storage is temp-only (ADR-0005).
5. **Clear failure modes** — pre-capture vs Extraction failure vs Commit retry (ADR-0008) avoid “stuck draft with dead photo” UX.
6. **Income kept simple** — no second taxonomy; voice kind switch recovers misclassification without recapture (ADR-0002).
7. **Category stability for LLM** — model picks among visible UUIDs; never invents labels; fallback «Прочее» keeps confirm usable (ADR-0001/0007).

### Insight strengths (what already exists to build on)

1. **Trusted committed set** — only Commit counts; Drafts never pollute totals.
2. **Live month math** — Edit/Delete immediately revalidate surfaces; no closed-month fiction (ADR-0004).
3. **Net + both sides** — expense total, income total, and net without inventing a Balance entity.
4. **Stable Category history** — Hide does not reassign past Expenses; historical classification remains readable for future “where did money go” views.
5. **Channel provenance stored** — available for future analytics/debug even though not editable.

### Insight gaps relative to capture depth

Capture is comparatively mature (multimodal + AI + lifecycle). Insight UI is **current-month net + bars + unfiltered history**. Helpers already in code (`shiftYearMonth`, month-scoped loaders, category ids on expenses) could support richer **read-only** insight without new domain entities — but **nothing beyond current month + two bars is shipped**. That asymmetry is the main baseline fact for map #54 prioritization (not a recommendation).

---

## 6. Surface map (as-is navigation)

```
Login (email OTP)
  └── App shell
        ├── Home: MonthlyTotalCard (net) + recent History[5] + link Categories
        ├── Capture dock (global): Photo | Voice | Manual → shells → ConfirmDraft
        ├── History: full list → /history/{expense|income}/:id Edit|Delete
        ├── Month: current month totals + bars
        └── Categories: manage lifecycle
```

Telegram surfaces: **specified, not navigable in shipped web app**.

---

## 7. Source index

| Area | Paths |
|------|--------|
| Domain language | `CONTEXT.md` |
| ADRs | `docs/adr/0001` … `0010` |
| Capture UI | `src/components/capture/*`, `src/app/(app)/capture/*` |
| Extract | `src/lib/extract/*`, `src/lib/capture/*` |
| Draft | `src/lib/draft/*` |
| Categories | `src/lib/categories/*`, `src/app/(app)/categories/*` |
| History / month | `src/lib/money/*`, `src/app/(app)/history/*`, `month/page.tsx`, `page.tsx` |
| Schema | `supabase/migrations/*`, ADR-0006 |
| Prototype IA | `prototype-screen-map/PROTOTYPE.md` |
| Product summary | `README.md` |

---

## 8. Open facts / non-blocking notes

- Competitive inventory research (`docs/research/*competitive*`) was **not** present on `main` at write time; gap themes are **market-common**, not app-by-app.
- Telegram ADRs may land implementation later under map #43; this baseline treats them as **decided-not-shipped**.
- `loadMonthMoney(yearMonth)` accepting a parameter is an implementation detail that makes past-month UI a UI gap, not a domain gap — still **Partial** until a surface uses it.

---

*End of baseline research. No product implementation in this artifact.*
