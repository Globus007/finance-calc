/** Domain shape of a Category row used by manage UI and lifecycle policy. */

export type CategoryOrigin = "seed" | "user";

export type CategoryRow = {
  id: string;
  displayName: string;
  origin: CategoryOrigin;
  isSystemFallback: boolean;
  isHidden: boolean;
  sortOrder: number;
  seedKey: string | null;
};

/**
 * RSC → client manage list item.
 * Only fields the UI uses (no seedKey/sortOrder) + precomputed action caps
 * so the client does not re-run lifecycle policy.
 */
export type CategoryManageItem = {
  id: string;
  displayName: string;
  origin: CategoryOrigin;
  isSystemFallback: boolean;
  isHidden: boolean;
  isInUse: boolean;
  canHide: boolean;
  canUnhide: boolean;
  canRename: boolean;
  canDelete: boolean;
};

