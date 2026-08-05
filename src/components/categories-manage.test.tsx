import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CategoriesManage } from "./categories-manage";
import type { CategoryManageItem } from "@/lib/categories/types";

afterEach(() => {
  cleanup();
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("@/app/(app)/categories/actions", () => ({
  createCategory: vi.fn(),
  renameCategory: vi.fn(),
  setCategoryHidden: vi.fn(),
  deleteCategory: vi.fn(),
}));

function item(
  partial: Pick<
    CategoryManageItem,
    "id" | "displayName" | "origin" | "isSystemFallback" | "isHidden" | "isInUse"
  > &
    Partial<CategoryManageItem>,
): CategoryManageItem {
  const base: CategoryManageItem = {
    canHide: false,
    canUnhide: false,
    canRename: false,
    canDelete: false,
    ...partial,
  };
  // Default caps from lifecycle shape if not overridden
  if (partial.isSystemFallback) {
    return base;
  }
  if (partial.origin === "seed") {
    return {
      ...base,
      canHide: !partial.isHidden,
      canUnhide: partial.isHidden,
    };
  }
  return {
    ...base,
    canHide: !partial.isHidden,
    canUnhide: partial.isHidden,
    canRename: true,
    canDelete: !partial.isInUse,
  };
}

const seed = item({
  id: "s1",
  displayName: "Продукты",
  origin: "seed",
  isSystemFallback: false,
  isHidden: false,
  isInUse: false,
});

const fallback = item({
  id: "sf",
  displayName: "Прочее",
  origin: "seed",
  isSystemFallback: true,
  isHidden: false,
  isInUse: false,
});

const custom = item({
  id: "u1",
  displayName: "Хобби",
  origin: "user",
  isSystemFallback: false,
  isHidden: false,
  isInUse: false,
});

const customInUse = item({
  id: "u2",
  displayName: "Спорт",
  origin: "user",
  isSystemFallback: false,
  isHidden: false,
  isInUse: true,
});

describe("CategoriesManage", () => {
  it("lists seed and user Categories with lifecycle-appropriate actions", () => {
    render(
      <CategoriesManage
        initialCategories={[seed, fallback, custom, customInUse]}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Категории" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Продукты")).toBeInTheDocument();
    expect(screen.getByText("Прочее")).toBeInTheDocument();
    expect(screen.getByText("Хобби")).toBeInTheDocument();

    const list = screen.getByRole("list", { name: "Список категорий" });
    expect(list).toBeInTheDocument();

    const hideButtons = screen.getAllByRole("button", { name: "Скрыть" });
    expect(hideButtons.length).toBeGreaterThanOrEqual(2);

    expect(screen.getByText("Нельзя изменить")).toBeInTheDocument();

    expect(
      screen.getAllByRole("button", { name: "Переименовать" }),
    ).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Удалить" })).toBeInTheDocument();

    expect(screen.getByText("Удаление недоступно")).toBeInTheDocument();

    expect(screen.getByLabelText("Новая категория")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Добавить" }),
    ).toBeInTheDocument();
  });

  it("shows unhide for a hidden seed Category", () => {
    render(
      <CategoriesManage
        initialCategories={[item({ ...seed, isHidden: true })]}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Показать" }),
    ).toBeInTheDocument();
    expect(screen.queryAllByRole("button", { name: "Скрыть" })).toHaveLength(
      0,
    );
  });
});
