# LLM structured extraction contract

MVP turns a **Receipt** (vision) or a **Recording** transcript (after STT) into Draft prefill via one **unified** structured-output schema. The model returns a small JSON object; the **server normalizes** it into domain fields before confirm. Photo always becomes an Expense Draft; voice may propose Expense or Income. No confidence fields, no multi-line arrays, no FX.

## Wire

- Prefer AI Gateway / AI SDK **`json_schema` / `Output.object`** with a single extract object. Forced tool/function is fallback only if a provider mishandles schema.
- Models (elsewhere): vision `google/gemini-2.5-flash-lite`; voice STT then text LLM extract (`openai/gpt-4o-mini-transcribe` path for STT).

## Model output schema (unified)

| Field | Type | Meaning |
|-------|------|---------|
| `record_kind` | `"expense" \| "income"` | Voice: model chooses. **Photo:** pipeline **forces `expense`** (model kind ignored). |
| `amount` | `number \| null` | BYN decimal; `null` if total not extracted. |
| `occurred_on` | `string \| null` | Calendar date `YYYY-MM-DD` only (no time/TZ). |
| `category_id` | `string (uuid) \| null` | Must be an id from the **visible** Categories injected in the prompt, or null. |
| `note` | `string \| null` | Merchant/context free text; empty string treated as null. No separate merchant field. |

Prompt injects only the user's **visible** Categories as `{ id, name }[]`. The model must not invent ids outside that list and must not create Categories.

## Server post-process → Draft prefill

1. **Photo:** set `record_kind` to expense.
2. **Amount:** absolute value, round to **2** decimal places; if missing or `≤ 0` after coerce → **null** (empty Amount on confirm).
3. **Occurred on:** keep valid `YYYY-MM-DD` (future dates allowed); invalid or null → **today in Europe/Minsk** (ADR-0004).
4. **Category:**
   - Income → always **null** (ignore model).
   - Expense → keep id if it is a **visible** Category for the user; null / unknown / hidden → **System fallback** «Прочее».
5. **Note:** trim; empty → null.
6. **Currency:** MVP is BYN only—no currency field. If the receipt is clearly another currency, prefer **null** Amount over inventing conversion; otherwise take the numeric total as BYN Amount and let the user correct on confirm.

Confirm field set and Commit rules remain ADR-0003. Voice Expense↔Income switch on confirm remains ADR-0002.

## Prompt product rules (not schema fields)

- Receipt Amount = **grand total**, not per-SKU lines.
- Voice multi-mention → **primary** (first / most complete) prospective record only; further events need a new capture cycle.
- Prefer **null** over inventing amount, date, or category.

## Failure modes

| Situation | Outcome |
|-----------|---------|
| Network / provider error / timeout | **Extraction failure** |
| STT failure or empty unusable transcript | **Extraction failure** |
| Vision error / completion unusable | **Extraction failure** |
| Non-parseable output / schema violation | **Extraction failure** |
| Valid schema object with many nulls (including null Amount) | **Success** → open confirm |
| Bad `category_id` on Expense | Success; Category → «Прочее» |

Incomplete Draft after a successful pipeline is not Extraction failure (ADR-0003). Recovery from Extraction failure is a **new capture** (media ephemeral, ADR-0005).

## Considered options

- **Separate receipt vs voice schemas** — rejected: one Zod/schema and one post-process path; photo coerces kind.
- **Category by display name or free-text fuzzy map** — rejected: stable `category_id` from the visible list is unambiguous; server remains source of truth.
- **Amount as string or integer kopecks** — rejected for MVP: JSON number BYN decimal is enough with server 2 dp coerce.
- **Required date always / datetime with TZ** — rejected: null → Minsk today; domain Occurred on is a calendar date.
- **Trust model category fully / fail on bad id** — rejected: fallback «Прочее» keeps confirm usable.
- **null Category on photo/voice like manual** — rejected: contradicts ADR-0003 prefill rules.
- **Missing Amount = Extraction failure** — rejected: open confirm (ADR-0003).
- **Model `usable` flag or confidence scores** — rejected: MVP has no confidence concept; transport/parse failures are enough.
- **Currency field / fail non-BYN** — rejected: single-currency MVP; user corrects on confirm.
- **Forced tool-only or free JSON mode** — rejected: structured `json_schema` / `Output.object` first; free JSON is brittle.
