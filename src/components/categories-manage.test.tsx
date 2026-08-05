import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CategoriesManage } from "./categories-manage";
import type { CategoryListItem } from "@/lib/categories";

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

const seed: CategoryListItem = {
  id: "s1",
  displayName: "Продукты",
  origin: "seed",
  isSystemFallback: false,
  isHidden: false,
  sortOrder: 1,
  seedKey: "products",
  isInUse: false,
};

const fallback: CategoryListItem = {
  id: "sf",
  displayName: "Прочее",
  origin: "seed",
  isSystemFallback: true,
  isHidden: false,
  sortOrder: 13,
  seedKey: "other",
  isInUse: false,
};

const custom: CategoryListItem = {
  id: "u1",
  displayName: "Хобби",
  origin: "user",
  isSystemFallback: false,
  isHidden: false,
  sortOrder: 0,
  seedKey: null,
  isInUse: false,
};

const customInUse: CategoryListItem = {
  ...custom,
  id: "u2",
  displayName: "Спорт",
  isInUse: true,
};

describe("CategoriesManage", () => {
  it("lists seed and user Categories with lifecycle-appropriate actions", () => {
    render(
      <CategoriesManage
        initialCategories={[seed, fallback, custom, customInUse]}
      />,
    );

    expect(screen.getByRole("heading", { name: "Категории" })).toBeInTheDocument();
    expect(screen.getByText("Продукты")).toBeInTheDocument();
    expect(screen.getByText("Прочее")).toBeInTheDocument();
    expect(screen.getByText("Хобби")).toBeInTheDocument();

    // Seed non-fallback: hide only
    const list = screen.getByRole("list", { name: "Список категорий" });
    expect(list).toBeInTheDocument();

    // Product seed row has Скрыть
    const hideButtons = screen.getAllByRole("button", { name: "Скрыть" });
    expect(hideButtons.length).toBeGreaterThanOrEqual(2);

    // Fallback has no destructive/hide actions
    expect(screen.getByText("Нельзя изменить")).toBeInTheDocument();

    // Unused custom: rename + delete; in-use custom still renames
    expect(screen.getAllByRole("button", { name: "Переименовать" })).toHaveLength(
      2,
    );
    expect(screen.getByRole("button", { name: "Удалить" })).toBeInTheDocument();

    // In-use custom: delete blocked label
    expect(screen.getByText("Удаление недоступно")).toBeInTheDocument();

    // Create form present
    expect(screen.getByLabelText("Новая категория")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Добавить" })).toBeInTheDocument();
  });

  it("shows unhide for a hidden seed Category", () => {
    render(
      <CategoriesManage
        initialCategories={[{ ...seed, isHidden: true }]}
      />,
    );
    expect(screen.getByRole("button", { name: "Показать" })).toBeInTheDocument();
    expect(screen.queryAllByRole("button", { name: "Скрыть" })).toHaveLength(0);
  });
});
