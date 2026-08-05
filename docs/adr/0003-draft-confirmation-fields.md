# Draft confirmation fields by channel

MVP uses one **confirm** shape for all Channels. Photo, voice, and manual differ only in **prefill** and capture inputs (Receipt / Recording / none), not in which fields exist or whether they are editable. A Draft is **in-flight only**: Commit or Discard—no deferred incomplete Draft list. **Save** in product copy maps to **Commit**.

## Confirm fields (editable)

| Draft target | Shown & editable | Not on form |
|--------------|------------------|-------------|
| Expense | Amount, Occurred on, Category, Note | Channel (system-set, stored on Commit) |
| Income | Amount, Occurred on, Note | Category (N/A), Channel (system-set, stored on Commit) |

No per-field **confidence** flags in MVP: uncertain extract values are empty or defaulted; the user corrects by eye.

## One record per Draft

An Expense Draft is exactly one prospective Expense (no multi-item Lines). An Income Draft remains exactly one prospective Income.

- **Receipt:** Amount is the **grand total**, not per-SKU positions; merchant/context may land in Note.
- **Recording:** if several amounts/events are spoken, extract the **primary** (first / most complete) record; further events need a new capture cycle.
- Several expenses or incomes ⇒ several capture → confirm → Commit cycles.

## Defaults and validity

| Field | Prefill / default |
|-------|-------------------|
| Occurred on | Extracted date if present; else **today in Europe/Minsk** (all Channels, Expense and Income; ADR-0004—not device TZ) |
| Amount | Extracted if present; else **empty** (Commit blocked until > 0) |
| Category (Expense) | Photo/voice: mapped visible Category or System fallback «Прочее»; **manual:** empty until user picks |
| Note | Extracted/free text or empty |
| Channel | Set at capture; not user-edited on confirm |

**Commit** (minimum valid):

- Expense: Amount (> 0 BYN) + Occurred on + Category  
- Income: Amount (> 0 BYN) + Occurred on  

Incomplete Drafts may still be shown after a successful pipeline (e.g. missing Amount). **Extraction failure** is only when the pipeline cannot open a usable Draft (transport/STT/vision failure or unusable input)—not “missing a field.”

Leaving confirm without Commit is **Discard** (explicit or equivalent). No auto-Commit.

Voice **Expense↔Income switch** on confirm stays (ADR-0002), simplified for single-record Drafts.

## Considered options

- **Channel-specific field sets / layouts as different models** — rejected: one schema and screen contract; prefill is enough differentiation.
- **Per-field confidence UI** — rejected for MVP: cost without clear action beyond “edit the field.”
- **Multi-Line Expense Draft / multi-Commit** — rejected: one spend (or income) per cycle; simpler confirm, schema, and LLM contract.
- **Receipt Amount = sum of line items or largest item** — rejected: grand total matches personal-finance “what I paid.”
- **Multi-mention voice → failure, queue of Drafts, or summed Amount** — rejected: primary record + separate cycles is predictable.
- **Persisted incomplete Drafts** — rejected for MVP: Commit \| Discard only.
- **Channel editable or omitted from storage** — rejected: hide on form, still store for analytics/debug.
- **Missing Amount after successful extract = Extraction failure** — rejected: open confirm and let the user type.
- **No default Occurred on** — rejected: today default cuts friction; user can edit.
- **Manual Category prefilled «Прочее»** — rejected: forces intentional classification on typed entry.
