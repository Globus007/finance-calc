# Personal finance capture

Single-user personal finance capture: expenses (with draft confirmation), simple income, categories, and monthly totals in BYN.

## Language

**Expense**:
A money outflow the user records for personal tracking. First-class concept, not a subtype of a shared transaction. A committed Expense always has Amount, Occurred on, and Category; Note and Channel may be present. One Commit creates exactly one Expense.
_Avoid_: Transaction, entry, payment, purchase, spending record

**Income**:
A money inflow the user records for personal tracking. First-class concept, separate from Expense; MVP keeps it deliberately simple. Created only via Draft → Commit (same lifecycle as Expense). Capture Channels for Income are voice and manual only—not photo. A committed Income always has Amount and Occurred on; it has no Category and no separate Source type—optional free-text context lives in Note; Channel may be present. MVP has no Transfer or Refund type—cashback/returns may be logged as Income at the user's judgment; own-account moves are out of scope.
_Avoid_: Transaction, entry, earning, credit, deposit, Income category, Source (as a required or typed field), Transfer, Refund (as domain types)

**Draft**:
A not-yet-committed capture result held for in-flight user confirmation only (Commit or Discard—no deferred/incomplete Draft list). It targets either exactly one future Expense or exactly one future Income, never mixed. Expense Drafts may come from photo, voice, or manual; Income Drafts only from voice or manual; photo always yields an Expense Draft. Confirm UI is the same field set across Channels; Channels differ only in prefill. An Expense Draft holds Amount, Occurred on, Category, and optional Note for that single prospective Expense (may be incomplete until Commit). An Income Draft holds Amount, Occurred on, and optional Note for that single prospective Income. Channel is set by the system from the capture path and is not a confirm form field.
_Avoid_: Pending expense, unsaved transaction, form state (as the domain name), temporary expense, Line, multi-item draft

**Commit**:
The user action that creates exactly one Expense or exactly one Income from a confirmed Draft and ends that Draft. There is no partial Commit and no residual Draft. Only committed Expenses and Incomes appear in History and Monthly totals. Expense Commit requires Amount, Occurred on, and Category. Income Commit requires Amount and Occurred on. Closing confirm without Commit is Discard (explicit or equivalent).
_Avoid_: Save (as the domain verb for this step), publish, finalize, post, sync

**Discard**:
The user action that abandons a whole Draft without creating an Expense or Income. Distinct from Delete of a committed record.
_Avoid_: Cancel (for this action), abort, reject

**Category**:
A user-facing label for classifying an Expense. One concept for seed and user-defined (origin is a property, not two types); applies only to Expenses and is required on every committed Expense. Stable identity is separate from display name; display names are unique per user across visible and hidden Categories (case-insensitive). Seed Categories cannot be renamed or hard-deleted; user-defined may be renamed and may be hard-deleted only when no committed Expense uses them. Automatic classification maps only to the user's visible Categories and never creates Categories; a new manual Expense Draft starts with no Category until the user chooses one.
_Avoid_: Tag, folder, budget line, expense type, Income category, Seed Category / Custom Category (as separate types)

**System fallback Category**:
The single seed Category used when automatic classification cannot choose a better visible Category. In MVP its display name is «Прочее»; it cannot be renamed, hidden, or deleted.
_Avoid_: Other, uncategorized, none, catch-all (as a separate type from Category)

**Hide**:
The user action that omits a Category from the usual picker for new Expense Drafts and from automatic mapping candidates. Committed Expenses keep that Category; History still shows it. Does not apply to the System fallback Category. Distinct from Delete.
_Avoid_: Archive (as the domain verb), soft-delete, disable, remove

**Unhide**:
The user action that reverses Hide so the Category is available again for pickers and automatic mapping. When editing a committed Expense whose Category is hidden, that Category remains choosable as the current value alongside all visible Categories.
_Avoid_: Restore, re-enable, unarchive (as the domain verb)

**Amount**:
The monetary value of an Expense or Income, always in BYN. On commit it must be greater than zero.
_Avoid_: Sum, total (for a single record), value, price

**Occurred on**:
The calendar date the Expense or Income is attributed to (when the money moved for tracking purposes), not the moment it was committed. Product “today” (e.g. default when capture omits a date) is the calendar date in Europe/Minsk, not the device timezone.
_Avoid_: Created at, timestamp, booked on, transaction date

**Note**:
Optional free-text on an Expense or Income (merchant name, income source hint, comment, or other detail in one field). Not a separate Merchant or Source concept.
_Avoid_: Merchant (as a separate concept), Source (as a required field), description, comment, memo

**Channel**:
How a Draft was produced: photo, voice, or manual. Set by the system at capture; stored on Commit; not shown or edited on the confirm form. Photo is Expense-only and starts from a Receipt; voice starts from a Recording (Expense or Income); manual has neither and works for both.
_Avoid_: Source (for capture path), input method, modality, origin

**Receipt**:
The photo input used to extract an Expense Draft (vision). Expense-only; Income has no Receipt path. Ephemeral: not kept as a stored archive after extraction; only the resulting Draft fields matter for the domain. Multi-item receipts still yield one Expense Draft: Amount is the receipt grand total (not per-SKU lines).
_Avoid_: Image, scan, ticket, invoice (as the name for this input), receipt gallery

**Recording**:
The voice audio input used to extract a Draft (speech-to-text then language extract). Ephemeral: not kept after extraction. If the utterance mentions several outflows or inflows, the Draft takes a single primary (first/most complete) prospective record; further captures are separate cycles.
_Avoid_: Audio clip, voice note, utterance (as the domain name)

**Extraction failure**:
When the capture pipeline cannot open a usable Draft (e.g. STT/vision/transport failure or unusable input). Distinct from an incomplete Draft (e.g. missing Amount after a successful pipeline run—confirm still opens so the user can fill fields), from Discard, and from Delete. Not a per-field confidence concept: MVP has no confidence flags on Draft fields.
_Avoid_: Error (as the domain name), cancel, failed save, confidence flag (as a domain field)

**Edit**:
Changing fields of an already committed Expense or Income. Not a return to Draft.
_Avoid_: Update draft, reopen, amend (as a separate lifecycle)

**Delete**:
Removing a committed Expense or Income entirely. Distinct from Discard (which only applies to Draft).
_Avoid_: Discard (for committed records), archive, void, soft-delete (as the domain verb)

**History**:
The single mixed list of committed Expenses and Incomes the user reviews and manages, ordered by Occurred on. Drafts never appear in History.
_Avoid_: Feed, ledger, journal, transaction list, separate expense-only or income-only history (as the default concept)

**Monthly total**:
Aggregated totals for one calendar month over committed Expenses and Incomes whose Occurred on falls in that month: expense total (sum of Expense Amounts), income total (sum of Income Amounts), and net (income total minus expense total). Net is a derived figure on Monthly total, not a separate domain entity. Drafts are excluded. Calendar month and “current month” use fixed Europe/Minsk. Totals are live: Edit or Delete of a committed record recalculates affected months immediately (no month-close snapshot). A month with no committed records is zeros; the current incomplete month uses the same live sum (so far), not a separate partial-month concept.
_Avoid_: Balance (as the name for this concept), budget, report, statement, rolling total, closed month, snapshot total
