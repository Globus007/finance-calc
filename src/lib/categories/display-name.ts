/** Matches manage UI `maxLength={80}`; enforced server-side too. */
export const MAX_CATEGORY_DISPLAY_NAME_LENGTH = 80;

/** Normalize user-facing Category display name for storage and uniqueness. */

export function normalizeDisplayName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

export function isBlankDisplayName(raw: string): boolean {
  return normalizeDisplayName(raw).length === 0;
}

/** True when normalized display name exceeds the shared max length. */
export function isTooLongDisplayName(raw: string): boolean {
  return normalizeDisplayName(raw).length > MAX_CATEGORY_DISPLAY_NAME_LENGTH;
}

/**
 * Case-insensitive uniqueness across the owner's Categories (visible + hidden).
 * When `excludeId` is set, that Category is ignored (rename to own name).
 */
export function isDuplicateDisplayName(
  raw: string,
  existing: readonly { id: string; displayName: string }[],
  excludeId?: string,
): boolean {
  const needle = normalizeDisplayName(raw).toLowerCase();
  if (!needle) return false;
  return existing.some(
    (row) =>
      row.id !== excludeId &&
      row.displayName.trim().toLowerCase() === needle,
  );
}
