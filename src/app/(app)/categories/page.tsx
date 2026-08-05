import { CategoriesManage } from "@/components/categories-manage";
import { loadCategoriesForManage } from "@/lib/categories/load-categories";

export default async function CategoriesPage() {
  const categories = await loadCategoriesForManage();

  return <CategoriesManage initialCategories={categories} />;
}
