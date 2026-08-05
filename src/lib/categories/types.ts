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

/** Category row plus usage flag for manage UI (hard-delete gate). */
export type CategoryListItem = CategoryRow & { isInUse: boolean };
