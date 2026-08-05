import { describe, expect, it } from "vitest";
import { sortCategoriesForManage } from "./sort-categories";
import type { CategoryRow } from "./types";

function cat(
  partial: Pick<CategoryRow, "id" | "displayName" | "origin" | "sortOrder"> &
    Partial<CategoryRow>,
): CategoryRow {
  return {
    isSystemFallback: false,
    isHidden: false,
    seedKey: partial.origin === "seed" ? partial.id : null,
    ...partial,
  };
}

describe("sortCategoriesForManage", () => {
  it("orders seed by sort_order then user-defined A–Я", () => {
    const rows = [
      cat({ id: "u2", displayName: "Яблоки", origin: "user", sortOrder: 0 }),
      cat({ id: "s2", displayName: "Транспорт", origin: "seed", sortOrder: 3 }),
      cat({ id: "u1", displayName: "Аптека", origin: "user", sortOrder: 99 }),
      cat({ id: "s1", displayName: "Продукты", origin: "seed", sortOrder: 1 }),
      cat({ id: "s3", displayName: "Прочее", origin: "seed", sortOrder: 13, isSystemFallback: true }),
    ];

    expect(sortCategoriesForManage(rows).map((c) => c.displayName)).toEqual([
      "Продукты",
      "Транспорт",
      "Прочее",
      "Аптека",
      "Яблоки",
    ]);
  });

  it("sorts user-defined A–Я by display name (Russian)", () => {
    const rows = [
      cat({ id: "1", displayName: "Хобби", origin: "user", sortOrder: 0 }),
      cat({ id: "2", displayName: "Авто", origin: "user", sortOrder: 0 }),
      cat({ id: "3", displayName: "Яхта", origin: "user", sortOrder: 0 }),
    ];

    expect(sortCategoriesForManage(rows).map((c) => c.displayName)).toEqual([
      "Авто",
      "Хобби",
      "Яхта",
    ]);
  });

  it("does not mutate the input array", () => {
    const rows = [
      cat({ id: "u", displayName: "Б", origin: "user", sortOrder: 0 }),
      cat({ id: "s", displayName: "А", origin: "seed", sortOrder: 1 }),
    ];
    const copy = [...rows];
    sortCategoriesForManage(rows);
    expect(rows).toEqual(copy);
  });
});
