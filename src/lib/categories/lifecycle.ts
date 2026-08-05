import {
  isBlankDisplayName,
  isDuplicateDisplayName,
  isTooLongDisplayName,
} from "./display-name";
import type { CategoryRow } from "./types";

export type CategoryCapabilities = {
  canHide: boolean;
  canUnhide: boolean;
  canRename: boolean;
  canDelete: boolean;
};

export type CategoryMutation =
  | { type: "hide" }
  | { type: "unhide" }
  | { type: "rename"; displayName: string }
  | { type: "delete" }
  | { type: "create"; displayName: string };

export type MutationRejection =
  | "forbidden_system_fallback"
  | "forbidden_seed"
  | "in_use"
  | "invalid_name"
  | "name_too_long"
  | "duplicate_name";

export type MutationResult =
  | { ok: true }
  | { ok: false; reason: MutationRejection };

export type MutationContext = {
  isInUse?: boolean;
  /** Owner's Categories for case-insensitive uniqueness. */
  existing?: readonly { id: string; displayName: string }[];
};

/** UI/actions matrix for a Category (ADR-0001). */
export function categoryCapabilities(
  category: Pick<
    CategoryRow,
    "origin" | "isSystemFallback" | "isHidden"
  >,
  options: { isInUse: boolean },
): CategoryCapabilities {
  if (category.isSystemFallback) {
    return {
      canHide: false,
      canUnhide: false,
      canRename: false,
      canDelete: false,
    };
  }

  if (category.origin === "seed") {
    return {
      canHide: !category.isHidden,
      canUnhide: category.isHidden,
      canRename: false,
      canDelete: false,
    };
  }

  return {
    canHide: !category.isHidden,
    canUnhide: category.isHidden,
    canRename: true,
    canDelete: !options.isInUse,
  };
}

/**
 * Validates a Category mutation before touching the database.
 * `category` is null only for `create`.
 */
export function validateCategoryMutation(
  category: CategoryRow | null,
  mutation: CategoryMutation,
  context: MutationContext = {},
): MutationResult {
  if (mutation.type === "create") {
    return validateName(mutation.displayName, context.existing ?? [], null);
  }

  if (!category) {
    return { ok: false, reason: "invalid_name" };
  }

  if (category.isSystemFallback) {
    return { ok: false, reason: "forbidden_system_fallback" };
  }

  if (mutation.type === "hide" || mutation.type === "unhide") {
    return { ok: true };
  }

  if (category.origin === "seed") {
    return { ok: false, reason: "forbidden_seed" };
  }

  if (mutation.type === "delete") {
    if (context.isInUse) {
      return { ok: false, reason: "in_use" };
    }
    return { ok: true };
  }

  if (mutation.type === "rename") {
    return validateName(
      mutation.displayName,
      context.existing ?? [],
      category.id,
    );
  }

  return { ok: true };
}

function validateName(
  raw: string,
  existing: readonly { id: string; displayName: string }[],
  selfId: string | null,
): MutationResult {
  if (isBlankDisplayName(raw)) {
    return { ok: false, reason: "invalid_name" };
  }
  if (isTooLongDisplayName(raw)) {
    return { ok: false, reason: "name_too_long" };
  }
  if (isDuplicateDisplayName(raw, existing, selfId ?? undefined)) {
    return { ok: false, reason: "duplicate_name" };
  }
  return { ok: true };
}
