# Personal finance capture

Single-user personal finance capture: expenses (with draft confirmation), simple income, categories, and monthly totals in BYN.

## Language

**Expense**:
A money outflow the user records for personal tracking. First-class concept, not a subtype of a shared transaction. A committed Expense always has Amount, Occurred on, and Category; Note and Channel may be present. One Commit may create several Expenses when the Draft has multiple Lines.
_Avoid_: Transaction, entry, payment, purchase, spending record

**Income**:
A money inflow the user records for personal tracking. First-class concept, separate from Expense; MVP keeps it deliberately simple. Created only via Draft → Commit (same lifecycle as Expense). Capture Channels for Income are voice and manual only—not photo. A committed Income always has Amount and Occurred on; it has no Category and no separate Source type—optional free-text context lives in Note; Channel may be present. MVP has no Transfer or Refund type—cashback/returns may be logged as Income at the user's judgment; own-account moves are out of scope.
_Avoid_: Transaction, entry, earning, credit, deposit, Income category, Source (as a required or typed field), Transfer, Refund (as domain types)

**Draft**:
A not-yet-committed capture result held for user confirmation. It targets either future Expense(s) or exactly one future Income, never mixed. Expense Drafts may come from photo, voice, or manual; Income Drafts only from voice or manual; photo always yields an Expense Draft. An Expense Draft holds one or more Lines (zero Lines → only Discard or add Lines); an Income Draft has no Lines—only the fields of that single prospective Income, which may be incomplete until Commit.
_Avoid_: Pending expense, unsaved transaction, form state (as the domain name), temporary expense

**Line**:
A single prospective Expense inside an Expense Draft. Each Line has its own Amount, Occurred on, Category, and optional Note. The user may remove Lines from the Draft before Commit; Commit turns every remaining valid Line into one Expense. Line does not exist for Income Drafts and is not used for splitting rows already in History.
_Avoid_: Item, position, split, partial expense, draft entry

**Commit**:
The user action that creates Expense(s) or one Income from a confirmed Draft and ends that Draft. There is no partial Commit that leaves a residual Draft: what remains in the Draft is what Commit applies to. Only committed Expenses and Incomes appear in History and Monthly totals. For an Expense Draft, there must be at least one Line, and every remaining Line must have Amount, Occurred on, and Category (one Expense per Line). An Income Draft Commit creates exactly one Income and requires Amount and Occurred on.
_Avoid_: Save (as the domain verb for this step), publish, finalize, post, sync

**Discard**:
The user action that abandons a whole Draft without creating an Expense or Income. Removing a single Line from an Expense Draft is not Discard. Distinct from Delete of a committed record.
_Avoid_: Cancel (for this action), abort, reject

**Category**:
A user-facing label for classifying an Expense. One concept for seed and user-defined (origin is a property, not two types); applies only to Expenses and is required on every committed Expense. Stable identity is separate from display name; display names are unique per user across visible and hidden Categories (case-insensitive). Seed Categories cannot be renamed or hard-deleted; user-defined may be renamed and may be hard-deleted only when no committed Expense uses them. Automatic classification maps only to the user's visible Categories and never creates Categories; a new manual Line starts with no Category until the user chooses one.
_Avoid_: Tag, folder, budget line, expense type, Income category, Seed Category / Custom Category (as separate types)

**System fallback Category**:
The single seed Category used when automatic classification cannot choose a better visible Category. In MVP its display name is «Прочее»; it cannot be renamed, hidden, or deleted.
_Avoid_: Other, uncategorized, none, catch-all (as a separate type from Category)

**Hide**:
The user action that omits a Category from the usual picker for new Draft Lines and from automatic mapping candidates. Committed Expenses keep that Category; History still shows it. Does not apply to the System fallback Category. Distinct from Delete.
_Avoid_: Archive (as the domain verb), soft-delete, disable, remove

**Unhide**:
The user action that reverses Hide so the Category is available again for pickers and automatic mapping. When editing a committed Expense whose Category is hidden, that Category remains choosable as the current value alongside all visible Categories.
_Avoid_: Restore, re-enable, unarchive (as the domain verb)

**Amount**:
The monetary value of an Expense or Income, always in BYN. On commit it must be greater than zero.
_Avoid_: Sum, total (for a single record), value, price

**Occurred on**:
The calendar date the Expense or Income is attributed to (when the money moved for tracking purposes), not the moment it was committed.
_Avoid_: Created at, timestamp, booked on, transaction date

**Note**:
Optional free-text on an Expense or Income (merchant name, income source hint, comment, or other detail in one field). Not a separate Merchant or Source concept.
_Avoid_: Merchant (as a separate concept), Source (as a required field), description, comment, memo

**Channel**:
How a Draft was produced: photo, voice, or manual. Domain vocabulary for capture path; not required to Commit. Photo is Expense-only and starts from a Receipt; voice starts from a Recording (Expense or Income); manual has neither and works for both.
_Avoid_: Source (for capture path), input method, modality, origin

**Receipt**:
The photo input used to extract an Expense Draft (vision). Expense-only; Income has no Receipt path. Ephemeral: not kept as a stored archive after extraction; only the resulting Draft fields matter for the domain.
_Avoid_: Image, scan, ticket, invoice (as the name for this input), receipt gallery

**Recording**:
The voice audio input used to extract a Draft (speech-to-text then language extract). Ephemeral: not kept after extraction.
_Avoid_: Audio clip, voice note, utterance (as the domain name)

**Extraction failure**:
When capture input (Receipt, Recording, or malformed manual attempt) does not yield a usable Draft. Distinct from Discard (user abandons an existing Draft) and from Delete.
_Avoid_: Error (as the domain name), cancel, failed save

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
Aggregated totals for a calendar month over committed Expenses and Incomes: expense total, income total, and net (income total minus expense total). Net is a derived figure on Monthly total, not a separate domain entity. Drafts are excluded. Exact month bounds and timezone are defined elsewhere.
_Avoid_: Balance (as the name for this concept), budget, report, statement
