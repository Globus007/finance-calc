# Personal finance capture

Single-user personal finance capture: expenses (with draft confirmation), simple income, categories, and monthly totals in BYN.

## Language

**Expense**:
A money outflow the user records for personal tracking. First-class concept, not a subtype of a shared transaction. A committed Expense always has Amount, Occurred on, and Category; Note and Channel may be present. One Commit may create several Expenses when the Draft has multiple Lines.
_Avoid_: Transaction, entry, payment, purchase, spending record

**Income**:
A money inflow the user records for personal tracking. First-class concept, separate from Expense; MVP keeps it deliberately simple. Created only via Draft → Commit (same lifecycle as Expense). A committed Income always has Amount and Occurred on; it has no Category.
_Avoid_: Transaction, entry, earning, credit, deposit

**Draft**:
A not-yet-committed capture result (from photo, voice, or manual input) held for user confirmation. It targets either future Expense(s) or a future Income, never mixed; it is not a saved Expense/Income in a draft status. An Expense Draft holds one or more Lines; fields on Lines may be incomplete until the user can Commit. An Expense Draft with zero Lines cannot be committed—only discarded or given new Lines.
_Avoid_: Pending expense, unsaved transaction, form state (as the domain name), temporary expense

**Line**:
A single prospective Expense inside an Expense Draft. Each Line has its own Amount, Occurred on, Category, and optional Note. The user may remove Lines from the Draft before Commit; Commit turns every remaining valid Line into one Expense. Line is not used for splitting rows already in History.
_Avoid_: Item, position, split, partial expense, draft entry

**Commit**:
The user action that creates Expense(s) or Income from a confirmed Draft and ends that Draft. There is no partial Commit that leaves a residual Draft: what remains in the Draft is what Commit applies to. Only committed Expenses and Incomes appear in History and Monthly totals. For an Expense Draft, there must be at least one Line, and every remaining Line must have Amount, Occurred on, and Category (one Expense per Line). Income Commit requires Amount and Occurred on.
_Avoid_: Save (as the domain verb for this step), publish, finalize, post, sync

**Discard**:
The user action that abandons a whole Draft without creating an Expense or Income. Removing a single Line from an Expense Draft is not Discard. Distinct from Delete of a committed record.
_Avoid_: Cancel (for this action), abort, reject

**Category**:
A user-facing label for classifying an Expense. One concept for both the product seed set and user-defined labels (seed vs user-defined is a property, not two types). Applies only to Expenses in MVP, not to Income. Required on every committed Expense.
_Avoid_: Tag, folder, budget line, expense type, Income category, Seed Category / Custom Category (as separate types)

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
How a Draft was produced: photo, voice, or manual. Domain vocabulary for capture path; not required to Commit. Photo channel starts from a Receipt; voice channel starts from a Recording; manual has neither.
_Avoid_: Source (for capture path), input method, modality, origin

**Receipt**:
The photo input used to extract an Expense Draft (vision). Ephemeral: not kept as a stored archive after extraction; only the resulting Draft fields matter for the domain.
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
The list of committed Expenses and Incomes the user reviews and manages. Drafts never appear in History.
_Avoid_: Feed, ledger, journal, transaction list

**Monthly total**:
Aggregated totals for a calendar month over committed Expenses and Incomes (at least expense total and income total). Drafts are excluded. Exact month bounds, timezone, and net presentation are defined elsewhere.
_Avoid_: Balance, budget, report (as the name for this concept), statement
