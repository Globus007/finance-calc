/** App max for Note on Expense / Income (ADR-0006 ~500). */
export const MAX_NOTE_LENGTH = 500;

/**
 * Optional Note: trim; empty → null; over max is invalid (caller rejects).
 */
export function normalizeNote(raw: string): string | null {
  const t = raw.trim().replace(/\s+/g, " ");
  if (!t) return null;
  return t;
}

export function isNoteTooLong(raw: string): boolean {
  const note = normalizeNote(raw);
  return note !== null && note.length > MAX_NOTE_LENGTH;
}
