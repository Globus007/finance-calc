/** Server-oriented re-exports. Client components should import modules directly
 * (bundle-barrel-imports) to keep the client graph small. */

export {
  isBlankDisplayName,
  isDuplicateDisplayName,
  normalizeDisplayName,
} from "./display-name";
export { categoryActionErrorMessage } from "./error-messages";
export {
  categoryCapabilities,
  validateCategoryMutation,
  type CategoryCapabilities,
  type CategoryMutation,
  type MutationContext,
  type MutationRejection,
  type MutationResult,
} from "./lifecycle";
export {
  CATEGORY_SELECT,
  mapCategoryRow,
  type CategoryDbRow,
} from "./map-row";
export { sortCategoriesForManage } from "./sort-categories";
export type {
  CategoryManageItem,
  CategoryOrigin,
  CategoryRow,
} from "./types";
