# Competitive feature inventory and signature moves

**Date:** 2026-08-08  
**Issue:** [#55 Research: Competitive feature inventory and signature moves](https://github.com/Globus007/finance-calc/issues/55)  
**Map:** [#54 Wayfinder: Competitive features shortlist (capture + insight)](https://github.com/Globus007/finance-calc/issues/54)  
**Branch:** `research/competitive-feature-inventory`

**Product context (this repo):** finance-calc is capture-first personal finance (Expense / Income, Draft→Commit, categories, History, Monthly total, BYN, single-user). This note is **market facts only** — inventory + distinctive “signature moves.” It does **not** prioritize what finance-calc should build.

**Seed article (checklist only, not primary truth):** [MBA journal — best expense apps 2026 overview](https://moscow.mba/journal/luchshie-prilozheniya-dlya-ucheta-rashodov-i-dohodov-v-2026-godu-polnyj-obzor)

**Method:** Marketing and store listings + first-party product/help pages (inventory depth). Claims are tagged:

| Tag | Meaning |
|-----|---------|
| **M** | Marketing / store claim (advertised; not independently verified in product) |
| **1P** | First-party site or official help |
| **H** | Hypothesis (synthesis / pattern, not a direct product claim) |

Apps scanned at inventory level:

| App | Identity note | Primary sources |
|-----|---------------|-----------------|
| **Monefy** | Reflective Technologies; “two-tap” expense tracker | [monefy.com](https://www.monefy.com/), [Play](https://play.google.com/store/apps/details?id=com.monefy.app.lite), [App Store](https://apps.apple.com/us/app/monefy-money-tracker/id1212024409) |
| **Деньги ОК / Money OK / Expenses OK** | Mobion suite; Expenses OK = expense-focused; Money OK = broader finance | [Play Деньги ОК](https://play.google.com/store/apps/details?id=biz.mobion.moneyokan), [App Store Expenses OK](https://apps.apple.com/us/app/expenses-ok-expenses-tracker/id932322041), [App Store Money OK](https://apps.apple.com/id/app/money-ok-personal-finance/id606031670), [moneyok.site](https://moneyok.site/) |
| **Money Lover** | Finsify | [moneylover.me](https://moneylover.me/), [Play](https://play.google.com/store/apps/details?id=com.bookmark.money) |
| **Money Flow** | “Budget Planner - Money Flow” by Hermann Wagenleitner | [App Store](https://apps.apple.com/us/app/budget-planner-money-flow/id900890647), [moneyflow.cloud](https://moneyflow.cloud) |
| **Innim (package)** | Play package `ru.innim.my_finance` listed as **Money manager & expenses**; developer listing is **Orange dog / Cleaner + Antivirus + VPN company** (not “Innim” branding on store) | [Play](https://play.google.com/store/apps/details?id=ru.innim.my_finance) |
| **Дзен-мани / Zenmoney** | Zenmoney OU | [zenmoney.app](https://zenmoney.app/), [Play (RU listing)](https://play.google.com/store/apps/details?id=ru.zenmoney.androidsub), [SMS help](https://zenmoney.helpshift.com/hc/en/3-zenmoney/faq/4-adding-transactions-from-banking-text-messages-sms/) |
| **CoinKeeper** | Disrapp / CoinKeeper³ | [coinkeeper.me/3](https://coinkeeper.me/3), [Play](https://play.google.com/store/apps/details?id=com.disrapp.coinkeeper3) |
| **Wallet (BudgetBakers)** | BudgetBakers s.r.o. | [budgetbakers.com Wallet](https://budgetbakers.com/en/products/wallet/), [Bank Sync](https://budgetbakers.com/en/products/wallet/features/bank-sync/), [Play](https://play.google.com/store/apps/details?id=com.droid4you.application.wallet) |
| **Money Manager Expense & Budget** | Realbyte Inc. | [realbyteapps.com](https://www.realbyteapps.com/), [Play](https://play.google.com/store/apps/details?id=com.realbyteapps.moneymanagerfree) |
| **Desktop (light)** | Домашняя бухгалтерия (Keepsoft); GnuCash | [keepsoft.ru HBK](https://www.keepsoft.ru/hbk/windows_hbk_about.php), [gnucash.org](https://www.gnucash.org/), [GnuCash features](https://www.gnucash.org/features.phtml) |

---

## 1. Executive summary

| Question | Finding |
|----------|---------|
| What do leading trackers advertise? | A **shared core** (fast manual entry, categories, multi-account “wallets,” charts, budgets/limits, recurring/bills, multi-currency, cloud sync, passcode) plus **optional power layers** (bank sync, family sharing, goals, debts, investments/net worth, export, AI assistants). |
| How do products differentiate? | Less by inventing wholly new domains and more by a **signature capture or insight move**: two-tap entry (Monefy), home-screen widget capture (Expenses OK), SMS/push bank recognition (Zenmoney), open-banking scale (Wallet / Zenmoney), drag-to-account UX + RU bank import + AI chat (CoinKeeper), double-entry assets (Money Manager / GnuCash), developer API/MCP (Wallet). |
| Capture vs automation split | **Manual-first / privacy-leaning** apps sell *speed of entry* (Monefy, Expenses OK, Money Flow, Innim package). **Automation-first** apps sell *zero routine* via bank API and/or SMS (Zenmoney, Wallet, CoinKeeper premium, Money Lover Linked Wallet). |
| Insight patterns | Pie / category distribution; period comparison; budget remaining; “free money” / cash-flow left in month; predictive spend; subscription spotting; AI Q&A over the ledger. |
| Feature classes rare or desktop-only | Strict **double-entry + small-business** (GnuCash); heavy **desktop multi-user + QR receipt (RU) + debt interest** (Домашняя бухгалтерия); **MCP/REST open finance data** (Wallet). |
| Caveats | Store copy is **M** unless cross-checked with first-party help. Bank-sync coverage is geo-dependent. Package `ru.innim.my_finance` branding has shifted — treat as the seed-list “Innim” slot, not a verified Innim company product page. |

---

## 2. Feature inventory by theme

Legend for cells: **Yes** = clearly advertised; **Partial** = limited free tier / secondary app in suite / region-gated; **—** = not advertised in sources reviewed; **?** = ambiguous.

### 2.1 Capture speed & entry modes

| Feature | Monefy | Деньги ОК / Expenses OK | Money Lover | Money Flow | Innim pkg | Zenmoney | CoinKeeper | Wallet | Money Manager |
|---------|--------|------------------------|-------------|------------|-----------|----------|------------|--------|---------------|
| Extremely fast manual expense entry | Yes **M** | Yes **M** | Yes **M** | Yes **M** | Yes **M** | Yes (manual still exists) **M** | Yes **M** | Yes (manual + auto) **M** | Yes **M** |
| Amount-first / minimal fields | Yes **M** (“amount only”) | Yes **M** | — | — | Couple of taps **M** | — | Fast coin UX (classic claim) **M** | — | Quick-add widgets **M** |
| Home / lock-screen widgets | Yes **M** | Yes **M** (signature) | — | Yes **M** | — | Free-money / status widgets **M** | — | — | Quick-Add widgets **M** |
| Recurring / scheduled entry | Yes **M** | — | Yes **M** | Yes **M** | Yes **M** | Yes **M** | Yes **M** | Planned payments **1P** | Recurrence / standing **M** |
| Attach photo / receipt image | — | — | — | Yes **M** | — | — | Screenshot import **1P** | Import files **1P** | Photo save **1P** |
| Voice / chat capture | — | — | — | — | — | Telegram bot insights **M** | Voice + chat AI **1P** | MCP natural language **1P** | — |
| SMS / push bank parse | — | — | — | — | — | Yes **1P** (RU/BY focus) | SMS + bank import **1P** | — | — |
| Open-banking / bank API sync | No **M** (FAQ: no auto bank) | — | Linked Wallet **M** | No (privacy lean) **M** | — | 3,300+ banks **1P** | RU banks list **1P** | 15,000+ banks **1P** | Not primary **M** |
| QR receipt scan (RU) | — | — | — | — | — | — | — | — | — |
| Geotag | — | — | — | Yes **M** | — | — | — | — | — |
| Tags / hashtags | — | — | — | Yes **M** | — | — | Yes **1P** | Labels (help) **1P** | Bookmark templates **M** |

**Desktop add-on:** Домашняя бухгалтерия advertises **QR-code receipt scan** (Russia) as a capture acceleration ([Keepsoft / product news](https://www.mont.ru/ru-ru/news/6022), product pages). GnuCash is register-style manual entry, not mobile capture **1P**.

### 2.2 Accounts, wallets, transfers

| Feature | Monefy | OK suite | Money Lover | Money Flow | Innim pkg | Zenmoney | CoinKeeper | Wallet | Money Manager |
|---------|--------|----------|-------------|------------|-----------|----------|------------|--------|---------------|
| Multiple accounts / wallets | Yes **M** | Yes **M** (Money OK) | Yes **M** | Yes **M** | Balance overview **M** | Yes **1P** | Yes **1P** | Yes **1P** | Yes **M** (free capped) |
| Transfers between accounts | — | Yes **M** | Implied wallets **M** | Yes **M** | — | Yes **M** | Yes **1P** | Yes **1P** | Yes **M** |
| Double-entry style bookkeeping | — | — | — | Supported **M** | — | Full asset picture **1P** | Net worth / assets **1P** | Investments + accounts **1P** | Explicit double-entry **M**/**1P** |
| Credit card settlement / debt | — | — | Debt & loan **1P** | — | — | Loans / debts **1P** | Debts & credits **1P** | Debts in reports **M** | Credit/debit card mgmt **M** |
| Investments / crypto / net worth | — | — | — | — | — | Crypto, metals, investments **1P** | Investments + net worth **1P** | Stocks / portfolio **M**/**1P** | Assets / real-estate **1P** |

### 2.3 Categories, budgets, goals

| Feature | Monefy | OK suite | Money Lover | Money Flow | Innim pkg | Zenmoney | CoinKeeper | Wallet | Money Manager |
|---------|--------|----------|-------------|------------|-----------|----------|------------|--------|---------------|
| Custom categories | Yes **M** | Yes **M** | Yes **M** | Yes **M** | Templates + custom **M** | Customizable **1P** | Unlimited on paid **1P** | Structured cats + labels **M** | Subcategories **M** |
| Subcategories / folders | — | Yes **M** | — | — | — | — | — | Sub/sub-sub notes **M** | Sub-category toggle **M** |
| Category / multi budgets | Budget tracker **M** | Budget (Money OK) **M** | Advanced / multi-cat budgets **M** | Flexible budgets **M** | Budget tracking **M** | Category plans + free money **M** | Category limits **1P** | Smart budgets **1P** | Monthly per category **1P** |
| Spending predictions | — | — | Predicts future spend **M** | — | — | AI category forecast **1P** | Pace / “time to stop” **M** | Predictive alerts **M** | — |
| Savings goals | — | — | Saving plan **1P** | — | — | Goals via free money **H** | Goals + date forecast **1P** | Savings goals **M** | — |
| Subscription detection | — | — | Bills **M** | — | — | Highlight stale subs **M** | Forgotten subs scan **1P** | Bills & subscriptions **M** | — |

### 2.4 Analytics & insight

| Feature | Monefy | OK suite | Money Lover | Money Flow | Innim pkg | Zenmoney | CoinKeeper | Wallet | Money Manager |
|---------|--------|----------|-------------|------------|-----------|----------|------------|--------|---------------|
| Pie / distribution charts | Yes **M** | Yes **M** | Reports **1P** | Interactive reports **M** | Diagrams **M** | Rich analytics **1P** | Many charts **1P** | Cash-flow insights **1P** | Charts **1P** |
| Period comparison (MoM) | Report period **M** | Daily/monthly/annual **M** | Diverse reports **M** | Flexible periods **M** | Period reports **M** | Trends highlighted **1P** | Month-to-month **1P** | Balance trends **M** | Month change stats **M** |
| Calendar view of txns | — | — | Financial calendar **M** (review) | — | — | Plans calendar **1P** | — | — | Calendar visuals **1P** |
| “Money left this month” | Green/red budget UX **M** | — | — | Daily budget plan **M** | Balance **M** | Free money widget **M** | Spend pace **M** | Cash flow **1P** | Budget vs spend graph **M** |
| AI assistant over data | — | — | — | — | — | Telegram bot tips **M** | AI Q&A Platinum PLUS **1P** | MCP to LLMs **1P** | — |
| Search / filter | — | — | — | Yes **M** | — | Inbox / merchants **M** | Search + tags **1P** | Filters **M** | Reinforced filter **1P** |

### 2.5 Sync, multi-user, platform

| Feature | Monefy | OK suite | Money Lover | Money Flow | Innim pkg | Zenmoney | CoinKeeper | Wallet | Money Manager |
|---------|--------|----------|-------------|------------|-----------|----------|------------|--------|---------------|
| Cloud / multi-device sync | Google Drive / Dropbox **M** | Sync **M** | Bank-standard sync **1P** | Optional account sync **M** | — | Cloud product **1P** | Instant multi-device **1P** | Secure cloud **M** | Backup; PC edit paid **M** |
| Family / shared budget | Partner via shared Drive **M**/**H** | — | Shared wallets + budgets **M** | Family Sharing IAP **M** | — | Family use cases **1P** | Family up to 5 **1P** | Group sharing Premium **1P** | — |
| Web / desktop companion | — | moneyok.site web **M** | web.moneylover.me **1P** | Mac (App Store) **M** | — | Web-class product **1P** | Desktop coming **1P** | Web + mobile **1P** | PC edit via Wi-Fi **M** |
| Offline-first | Local + optional sync **H** | Local **H** | — | Local optional **M** | — | Sync-first **H** | Offline core **1P** | Cloud-first **H** | Local **H** |
| Passcode / biometrics | Yes **M** | Face/Touch ID **M** | PIN / fingerprint **M** | Touch/Face ID **M** | Passcode **M** | — | PIN / FaceID **1P** | Bank-level security **1P** | Passcode **M** |

### 2.6 Export, integrations, currency

| Feature | Monefy | OK suite | Money Lover | Money Flow | Innim pkg | Zenmoney | CoinKeeper | Wallet | Money Manager |
|---------|--------|----------|-------------|------------|-----------|----------|------------|--------|---------------|
| Export CSV / Excel | Backup & export **M** | CSV **M** | Google Sheets **M** | CSV reports **M** | — | (paid reports) **M** | CSV Platinum **1P** | CSV/XLS/OFX import **1P** | Excel backup **M** |
| Public API / MCP | — | — | — | — | — | — | — | REST + MCP **1P** | — |
| Multi-currency | Yes **M** | — | Travel mode + rates **1P** | 170+ currencies **M** | Real-time rates **M** | Multi-asset **1P** | Multi-currency free **1P** | Full multi-currency **1P** | Yes **M** |
| Telegram surface | — | — | — | — | — | Care bot **M** | AI bot t.me **1P** | — | — |

### 2.7 Desktop-only distinct feature classes (light)

| Feature class | Who | Source | Note |
|---------------|-----|--------|------|
| Professional **double-entry** + splits + stocks/bonds + small-business invoices | **GnuCash** | [gnucash.org](https://www.gnucash.org/), [features](https://www.gnucash.org/features.phtml) | Accounting discipline as product, not mobile UX speed |
| Desktop multi-user passwords, debt interest amortization, QR receipt (RU), broad import/export (XLS/CSV/QIF/PDF…) | **Домашняя бухгалтерия** | [Keepsoft](https://www.keepsoft.ru/hbk/windows_hbk_about.php), Wikipedia summary of capabilities | Classic “home bookkeeping” class; mobile companions exist |

---

## 3. Per-app feature snapshot (advertised)

### Monefy
- **Positioning:** Lightning-fast expense tracking; “record in two taps / amount only.” **M**/**1P**
- **Features:** Fast entry, category pie/list, multi-currency, custom categories, recurring, multiple accounts, widgets, passcode, budget tracker, backup/export, sync via **user’s** Google Drive or Dropbox (not vendor bank link). **M**
- **Explicit non-feature:** FAQ implies no automatic bank connection. **M**
- Sources: [monefy.com](https://www.monefy.com/), [Play](https://play.google.com/store/apps/details?id=com.monefy.app.lite), [App Store](https://apps.apple.com/us/app/monefy-money-tracker/id1212024409)

### Деньги ОК / Expenses OK / Money OK (Mobion)
- **Expenses OK:** Fastest expense tracking; widget, subcategories, pie, sync, biometrics, CSV, backups. **M**
- **Деньги ОК (Android):** Expense/income recognition, unlimited accounts & categories, subentries, transfers, daily/monthly/annual reports, sync, backups. **M**
- **Money OK:** Expenses, income, budget, calculator, multiple accounts, subcategories (App Store list). **M**
- Sources: [Play](https://play.google.com/store/apps/details?id=biz.mobion.moneyokan), [Expenses OK App Store](https://apps.apple.com/us/app/expenses-ok-expenses-tracker/id932322041), [Money OK App Store](https://apps.apple.com/id/app/money-ok-personal-finance/id606031670)

### Money Lover
- **Positioning:** Simple tracker + painless budgeting + whole-picture reports. **1P**
- **Features:** Multi-device sync, recurring with reminders, travel mode (currencies), saving plans, debt/loan, effortless entry (manual or automatic), multiple wallets, category budgets (incl. multi-category and shared-wallet budgets), bank sync via Linked Wallet, Google Sheets export, PIN/biometrics. **M**/**1P**
- Sources: [moneylover.me](https://moneylover.me/), [Play](https://play.google.com/store/apps/details?id=com.bookmark.money)

### Money Flow (Budget Planner - Money Flow)
- **Positioning:** Quick tracking with flexible structure; privacy-friendly (no forced bank link). **M**
- **Features:** Quick add, customizable accounts/categories, sync, flexible budgets, scheduled transactions, calculator + converter, multi-currency (170+), transfers / double-entry supported, interactive reports, image attach, biometrics, geotag, tags, search, widgets, CSV export. **M**
- Sources: [App Store](https://apps.apple.com/us/app/budget-planner-money-flow/id900890647), [moneyflow.cloud](https://moneyflow.cloud)

### Innim package (`ru.innim.my_finance`)
- **Store title:** Money manager & expenses (developer listing: Orange dog / Cleaner company).
- **Features:** Couple-of-taps entry; auto balance + diagrams; period/category reports; templates/custom categories; multi-currency with live rates; reminders and automatic recurring; passcode; recent release notes: compact transaction form, hide unused fields. **M**
- **Caveat:** Seed name “Innim” maps to package ID; brand ownership appears transferred — inventory is from current Play listing only.
- Source: [Play](https://play.google.com/store/apps/details?id=ru.innim.my_finance)

### Дзен-мани / Zenmoney
- **Positioning:** Reduce financial anxiety; full picture without routine. **1P**
- **Features:** Bank sync (3,300+ worldwide via partners e.g. GoCardless for EU; regional banks called out on RU Play listing), SMS recognition, auto-categorization, multi-asset (loans, deposits, investments, crypto, metals), analytics with trends, spending forecasts / AI category prediction, monthly budget and **free money**, plans calendar, Telegram bot for alerts and MoM comparisons, family narratives. Free Basic = manual; Full Zen = reports, planning, banks. **M**/**1P**
- Sources: [zenmoney.app](https://zenmoney.app/), [Play](https://play.google.com/store/apps/details?id=ru.zenmoney.androidsub), [SMS FAQ](https://zenmoney.helpshift.com/hc/en/3-zenmoney/faq/4-adding-transactions-from-banking-text-messages-sms/)

### CoinKeeper
- **Positioning:** Answers “where does money go,” family peace, capital growth. **1P**
- **Features:** All accounts one screen; category analytics & MoM charts; budgets/limits; bank import (T-Bank, Sber, Alfa, VTB, Raiffeisen, Gazprombank…) + SMS; multi-device sync; recurring; goals with date forecast; debts; tags/comments; family up to 5; net worth / investments; subscription finder; AI assistant (voice, photo of statement screenshot, chat Q&A); offline core. Freemium tiers Free / Platinum / Platinum PLUS. **1P**/**M**
- Sources: [coinkeeper.me/3](https://coinkeeper.me/3), [Play](https://play.google.com/store/apps/details?id=com.disrapp.coinkeeper3)

### Wallet (BudgetBakers)
- **Positioning:** All-in-one manager with bank sync and smart budgets. **1P**
- **Features:** Bank sync 15,000+; auto-categorize; smart/flexible budgets; planned payments; cash-flow insights; multi-currency; investments/net worth; family group sharing; CSV/XLS/OFX import; lifetime premium option; **REST API + MCP** for AI assistants and Excel/Power BI. Free manual tier; Premium automation. **1P**/**M**
- Sources: [Wallet product](https://budgetbakers.com/en/products/wallet/), [Bank Sync](https://budgetbakers.com/en/products/wallet/features/bank-sync/), [Play](https://play.google.com/store/apps/details?id=com.droid4you.application.wallet)

### Money Manager Expense & Budget (Realbyte)
- **Positioning:** Easy personal finance with double-entry asset management. **1P**/**M**
- **Features:** Double-entry bookkeeping; budget vs spend graphs; credit/debit card settlement dates; transfers, direct debit, recurrence; instant category stats; bookmarks for frequent expenses; photo on transactions; calendar; filters; multi-currency; passcode; Excel backup; PC edit (paid); Quick-Add widgets; free asset count limit. **M**/**1P**
- Sources: [realbyteapps.com](https://www.realbyteapps.com/), [Play](https://play.google.com/store/apps/details?id=com.realbyteapps.moneymanagerfree)

---

## 4. Signature moves (7)

These are the **most distinctive advertised moves** across the set — not the shared commodity features (categories, pie charts, basic budgets).

### 1. Two-tap / amount-only capture
- **Who:** Monefy (also echoed by Expenses OK “enter amount — that’s it”).
- **What:** Marketing reduces capture to *amount + category icon*, intentionally avoiding bank linking.
- **Why it hooks:** The dominant failure mode of personal finance apps is **abandonment of logging**. Making capture feel like a game mechanic (big buttons, icons) keeps the habit alive so insight has data to work on.
- **Sources:** [Play Monefy](https://play.google.com/store/apps/details?id=com.monefy.app.lite), [App Store Expenses OK](https://apps.apple.com/us/app/expenses-ok-expenses-tracker/id932322041). **M**

### 2. Home-screen widget as primary capture surface
- **Who:** Expenses OK / Деньги ОК suite; also Monefy, Money Flow, Money Manager Quick-Add.
- **What:** Log without opening the full app — widget is the product.
- **Why it hooks:** Removes navigation friction at the moment of spend (shop queue, café). Capture at the **point of cash outflow** beats end-of-day reconstruction.
- **Sources:** [Expenses OK App Store](https://apps.apple.com/us/app/expenses-ok-expenses-tracker/id932322041), [Money Manager release notes / widgets](https://play.google.com/store/apps/details?id=com.realbyteapps.moneymanagerfree). **M**

### 3. Bank SMS / push recognition (without full open banking)
- **Who:** Zenmoney (documented help); CoinKeeper (SMS + bank import).
- **What:** Parse banking SMS (copy-paste on iOS; more automatic on Android) to create transactions; optional full bank API where available.
- **Why it hooks:** In markets where open banking is uneven, SMS is a **pragmatic automation bridge**. User keeps cards/cash habits but skips retyping amounts — “no routine” without full bank credentials story.
- **Sources:** [Zenmoney SMS help](https://zenmoney.helpshift.com/hc/en/3-zenmoney/faq/4-adding-transactions-from-banking-text-messages-sms/), [coinkeeper.me/3](https://coinkeeper.me/3), [Play Zenmoney](https://play.google.com/store/apps/details?id=ru.zenmoney.androidsub). **1P**/**M**

### 4. Open-banking scale + auto-categorize + budget feed
- **Who:** Wallet (15k+ banks); Zenmoney (3.3k+); Money Lover Linked Wallet; CoinKeeper regional bank list.
- **What:** Connect institutions → transactions land categorized → budgets/cash-flow update automatically.
- **Why it hooks:** Promises the emotional payoff of finance apps (**complete truth**) without daily discipline. Sells “zen” / control / free mental load — paid tier monetization sits here.
- **Sources:** [Wallet Bank Sync](https://budgetbakers.com/en/products/wallet/features/bank-sync/), [zenmoney.app](https://zenmoney.app/), [Money Lover Play](https://play.google.com/store/apps/details?id=com.bookmark.money). **1P**/**M**

### 5. “Free money” / cash left this month as the hero metric
- **Who:** Zenmoney (free money widget + plan); adjacent: CoinKeeper spend pace, Wallet cash-flow, Monefy green/red budget.
- **What:** Not only “spent X on Food” but **how much is still safe to spend** after planned obligations.
- **Why it hooks:** Converts analytics into a **daily decision aid** (“can I buy this?”). Stronger hook than historical pie charts alone because it is forward-looking and anxiety-reducing — which is exactly Zenmoney’s brand copy.
- **Sources:** [Play Zenmoney](https://play.google.com/store/apps/details?id=ru.zenmoney.androidsub), [zenmoney.app](https://zenmoney.app/). **M**/**1P**

### 6. AI over *my* ledger (voice, screenshot, Q&A) + optional Telegram
- **Who:** CoinKeeper Platinum PLUS AI; Zenmoney Telegram care bot; Wallet MCP for external LLMs.
- **What:** Natural-language add (“spent 450 on lunch”), photo of bank screenshot → parse lines, or ask “where did money go in May?”; or expose data to Claude/ChatGPT via MCP.
- **Why it hooks:** Combines **capture** and **insight** in the same conversational channel users already live in. Feels magical vs forms; differentiates paid tiers; Wallet’s MCP is a developer-facing variant of the same idea (AI as interface).
- **Sources:** [coinkeeper.me/3](https://coinkeeper.me/3), [Play Zenmoney](https://play.google.com/store/apps/details?id=ru.zenmoney.androidsub), [Wallet integrations](https://budgetbakers.com/en/products/wallet/). **1P**/**M**

### 7. Double-entry / full asset ledger (accounts that always balance)
- **Who:** Money Manager (explicit double-entry); Money Flow (double-entry supported); GnuCash (professional double-entry); Wallet/CoinKeeper/Zenmoney asset + investment aggregation (softer form).
- **What:** Every expense is also a movement of assets; transfers, loans, investments live in one balanced system — not a flat “expense list.”
- **Why it hooks:** Appeals to users who want **trust in totals** (“where is my money *now*?”) and net-worth progress. Distinct from pure expense diaries; desktop GnuCash is the extreme end of this class.
- **Sources:** [Realbyte site](https://www.realbyteapps.com/), [Play Money Manager](https://play.google.com/store/apps/details?id=com.realbyteapps.moneymanagerfree), [GnuCash features](https://www.gnucash.org/features.phtml), [Money Flow App Store](https://apps.apple.com/us/app/budget-planner-money-flow/id900890647). **M**/**1P**

---

## 5. Cross-cutting patterns (synthesis)

Tagged **H** unless citing a specific product claim.

1. **Capture friction is the product for half the market; automation is the product for the other half.** Manual-first apps compete on taps/widgets; automation-first apps compete on bank coverage and categorization quality. **H**
2. **Budgets are near-universal marketing language**, but implementations range from a single monthly total (Monefy-style) to multi-category + shared-wallet budgets (Money Lover) to AI-planned free money (Zenmoney). **H** + sources above.
3. **Family multi-user is a premium upsell**, not free-tier default (CoinKeeper PLUS, Wallet Premium, Money Lover shared wallets). **M**
4. **AI is landing as:** (a) capture modality, (b) Q&A insight, (c) external LLM via API/MCP — not as a separate “chatbot app.” **H**
5. **Export and PC/web companions** appear when users accumulate multi-year data (Money Lover Sheets, Realbyte PC, Wallet API, desktop bookkeeping tools). **H**
6. **Receipt photo** appears (Money Flow, Realbyte, CoinKeeper screenshots, Keepsoft QR) but is **not** the universal hero claim that bank sync is — still secondary to amount entry or bank feed. **H**

---

## 6. Implications for a capture-first product (descriptive only)

No shortlist, no “do/later/never.” Observations relevant to a product that already has Draft→Commit, History, Monthly total, categories:

1. **Market validates capture speed as a category-defining promise** (Monefy, Expenses OK). Competitors treat “seconds to log” as the core habit engine.
2. **Insight that hooks is often *derived from committed history***: category distribution, MoM comparison, pace-within-month, “money left” — several of these do not require a formal Budget entity in marketing copy (they can be computed views). **H** for entity design; **M** for feature presence.
3. **Automation (bank/SMS) and multi-user/family** are large adjacent product classes with heavy compliance/geo cost; they dominate full money-manager positioning (Zenmoney, Wallet, CoinKeeper).
4. **Conversational / media capture** (voice, photo, chat, Telegram bots) is an emerging signature layer on top of classic forms — adjacent to capture-first roadmaps industry-wide. **H** as trend reading of CoinKeeper + Zenmoney Telegram + Wallet MCP.
5. **Double-entry, investments, and desktop bookkeeping** form a different user job (“asset truth”) than “log this coffee.” Inventory-relevant as contrast classes, not as capture peers.

---

## 7. Source index

| Source | URL |
|--------|-----|
| Monefy site | https://www.monefy.com/ |
| Monefy Play | https://play.google.com/store/apps/details?id=com.monefy.app.lite |
| Monefy App Store | https://apps.apple.com/us/app/monefy-money-tracker/id1212024409 |
| Деньги ОК Play | https://play.google.com/store/apps/details?id=biz.mobion.moneyokan |
| Expenses OK App Store | https://apps.apple.com/us/app/expenses-ok-expenses-tracker/id932322041 |
| Money OK App Store | https://apps.apple.com/id/app/money-ok-personal-finance/id606031670 |
| Money Lover site | https://moneylover.me/ |
| Money Lover Play | https://play.google.com/store/apps/details?id=com.bookmark.money |
| Money Flow App Store | https://apps.apple.com/us/app/budget-planner-money-flow/id900890647 |
| Money Flow legal/site | https://moneyflow.cloud |
| Innim package Play | https://play.google.com/store/apps/details?id=ru.innim.my_finance |
| Zenmoney site | https://zenmoney.app/ |
| Zenmoney Play | https://play.google.com/store/apps/details?id=ru.zenmoney.androidsub |
| Zenmoney SMS help | https://zenmoney.helpshift.com/hc/en/3-zenmoney/faq/4-adding-transactions-from-banking-text-messages-sms/ |
| CoinKeeper landing | https://coinkeeper.me/3 |
| CoinKeeper Play | https://play.google.com/store/apps/details?id=com.disrapp.coinkeeper3 |
| Wallet product | https://budgetbakers.com/en/products/wallet/ |
| Wallet bank sync | https://budgetbakers.com/en/products/wallet/features/bank-sync/ |
| Wallet Play | https://play.google.com/store/apps/details?id=com.droid4you.application.wallet |
| Realbyte Money Manager | https://www.realbyteapps.com/ |
| Money Manager Play | https://play.google.com/store/apps/details?id=com.realbyteapps.moneymanagerfree |
| GnuCash | https://www.gnucash.org/ |
| GnuCash features | https://www.gnucash.org/features.phtml |
| Домашняя бухгалтерия | https://www.keepsoft.ru/hbk/windows_hbk_about.php |
| Seed article (checklist) | https://moscow.mba/journal/luchshie-prilozheniya-dlya-ucheta-rashodov-i-dohodov-v-2026-godu-polnyj-obzor |

---

## 8. Open gaps / honesty notes

- No full UX teardown or side-by-side interactive testing was performed (out of scope).
- Some store pages may show **geo-specific** bank lists or pricing; coverage claims are marketing maxima.
- **Innim** identity is package-based only; do not assume continuous product lineage under that brand name.
- Seed MBA article was not used as factual authority for feature presence.
- “Signature move” selection is an editorial synthesis (**H** for ranking); each move is grounded in product marketing (**M**/**1P**).
