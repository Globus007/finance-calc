# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary users are people tracking their own personal money, not a family shared budget and not a multi-account household.

They use the product in short, in-the-moment sessions: a receipt, a spoken amount, or a typed Amount, then a glance at cash on hand and this month. One authenticated person per account. The product is for a general personal-finance audience, not a single private operator.

UI copy is Russian.

## Product Purpose

finance-calc lets one person record personal Expenses and Incomes in BYN, then see live cash Remainder and calendar-month totals.

Success is a committed record after a fast capture cycle, and a trustworthy Remainder after Set Opening — not budgets, savings goals, or an AI chat that explains spending.

## Positioning

The product is capture-first: photo (receipt → Expense), voice, or manual → one in-flight Draft → Commit or Discard. Photo is Expense-only. Voice and manual work for Expense and Income. Media is ephemeral; confirm holds Draft fields only.

That cycle, plus live Remainder from a dated Opening, is the mechanism. Neighboring finance apps that lead with accounts, budgets, or an assistant chat cannot truthfully claim this as their core job.

## Operating Context

- Installable PWA (camera and microphone need HTTPS).
- Home: Remainder, current-month tiles, recent History. Category breakdown is on Month only. Bottom dock: Домой | photo · voice (primary) · manual | Месяц. Categories from the header; full History via «Все».
- Confirm is the same field set across Channels; Channels differ only in prefill. At most one open Draft per user on a given surface.
- Month screen: Monthly total (expense total, income total, net) for Europe/Minsk calendar months.
- History: mixed committed Expenses and Incomes; Edit and Delete of committed records; Drafts never appear.
- Auth: email 6-digit OTP (PWA-safe), plus Google / GitHub / Discord OAuth; magic link is secondary.
- Telegram bot exists as a working Expense-capture surface (photo + voice → in-chat confirm → same committed Expenses). It is not the core product or the brand surface. PWA design does not have to mimic chat.
- Domain vocabulary and rules: `CONTEXT.md`. Architectural decisions: `docs/adr/`.

## Capabilities and Constraints

Confirmed:

- Currency is BYN only. Product “today”, Occurred on, and calendar months use Europe/Minsk. No multi-currency and no device-timezone calendar.
- Amount on Commit must be greater than zero. Opening amount may be zero, never negative. Remainder may be negative and does not block Commit. Remainder is absent (not zero) until the first Set Opening; Opening cannot be cleared after the first write.
- Expense Commit requires Amount, Occurred on, Category. Income has no Category. System fallback Category display name is «Прочее».
- One Commit creates exactly one Expense or one Income. Multi-item receipts still yield one Expense Draft (receipt grand total).
- Extraction failure recovery is a new capture on the same Channel, not retry of retained media.
- Platform is web PWA, not native iOS or Android. The Dribbble reference looks native; that is not the shipping platform.

Explicitly out of product job (reference screens do not add these):

- AI money assistant / chat (“Money AI”, spending Q&A).
- Savings as a product figure, Budget Planner, Goal Tracker.

Undecided:

- Whether Telegram remains in a future visual redesign of the PWA (the bot may keep working independently).
- Public product name beyond repo `finance-calc` and UI «Финансы» / mark `Br`.

## Brand Commitments

- Binding visual reference for future visual work (look only, not product job, copy, currency, or features): https://cdn.dribbble.com/userupload/48773820/file/55a234bea82c520eba130803ec51bf7a.png?resize=3200x2400&vertical=center
- Do not copy the reference’s product identity: “Money AI”, “AI Monty Assistant”, GBP, named fictional user, or assistant-chat IA.
- No separate legal name, logo, or voice guide. Incumbent UI uses «Финансы», kicker «Личный обзор», and a `Br` mark.
- Domain terms in `CONTEXT.md` are the product language (Expense, Income, Draft, Commit, Discard, Remainder, Opening, History, Monthly total, Channel, Receipt, Recording). Avoid the glossary’s listed synonyms in product copy and design docs.

## Evidence on Hand

- Domain model: `CONTEXT.md`
- ADRs: `docs/adr/`
- Production app: `src/app/`, `src/components/`
- Throwaway IA prototype (not production): `prototype-screen-map/`
- Visual reference (external): Dribbble PNG URL in Brand Commitments

Do not fabricate testimonials, customer names, benchmarks, pricing, or press.

## Product Principles

1. Capture one real movement of money, then stop — the Draft is for confirming that one record, not a queue or a journal in progress.
2. Remainder is counted cash from Opening, not a budget, account balance, or month net.
3. Speed at the moment of spend beats analysis: photo, voice, and manual exist so the record happens before the receipt is lost.
4. The PWA is the product surface; other channels (Telegram) may capture into the same records without setting the product’s job or look.
5. Numbers the user sees must match Europe/Minsk dates and BYN — a prettier home screen that implies another currency or calendar is wrong.

## Accessibility & Inclusion

No product-specific WCAG target or inclusion requirement was set. Default to unobstructed PWA use (OTP in-app, large capture controls, Russian UI) without claiming a conformance level.
