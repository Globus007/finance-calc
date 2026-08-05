import { describe, expect, it } from "vitest";
import {
  categoryCapabilities,
  validateCategoryMutation,
} from "./lifecycle";
import type { CategoryRow } from "./types";

const seed: CategoryRow = {
  id: "s1",
  displayName: "Продукты",
  origin: "seed",
  isSystemFallback: false,
  isHidden: false,
  sortOrder: 1,
  seedKey: "products",
};

const fallback: CategoryRow = {
  id: "sf",
  displayName: "Прочее",
  origin: "seed",
  isSystemFallback: true,
  isHidden: false,
  sortOrder: 13,
  seedKey: "other",
};

const user: CategoryRow = {
  id: "u1",
  displayName: "Хобби",
  origin: "user",
  isSystemFallback: false,
  isHidden: false,
  sortOrder: 0,
  seedKey: null,
};

describe("categoryCapabilities", () => {
  it("blocks rename/delete/hide for System fallback «Прочее»", () => {
    expect(categoryCapabilities(fallback, { isInUse: false })).toEqual({
      canHide: false,
      canUnhide: false,
      canRename: false,
      canDelete: false,
    });
  });

  it("allows hide/unhide only for non-fallback seed", () => {
    expect(categoryCapabilities(seed, { isInUse: true })).toEqual({
      canHide: true,
      canUnhide: false,
      canRename: false,
      canDelete: false,
    });
    expect(
      categoryCapabilities({ ...seed, isHidden: true }, { isInUse: false }),
    ).toEqual({
      canHide: false,
      canUnhide: true,
      canRename: false,
      canDelete: false,
    });
  });

  it("allows full lifecycle for unused user-defined Category", () => {
    expect(categoryCapabilities(user, { isInUse: false })).toEqual({
      canHide: true,
      canUnhide: false,
      canRename: true,
      canDelete: true,
    });
  });

  it("blocks hard-delete when user-defined Category is in use", () => {
    expect(categoryCapabilities(user, { isInUse: true }).canDelete).toBe(
      false,
    );
  });
});

describe("validateCategoryMutation", () => {
  it("rejects hide/rename/delete on System fallback", () => {
    expect(validateCategoryMutation(fallback, { type: "hide" })).toEqual({
      ok: false,
      reason: "forbidden_system_fallback",
    });
    expect(
      validateCategoryMutation(fallback, {
        type: "rename",
        displayName: "Другое",
      }),
    ).toEqual({ ok: false, reason: "forbidden_system_fallback" });
    expect(
      validateCategoryMutation(fallback, { type: "delete" }, { isInUse: false }),
    ).toEqual({ ok: false, reason: "forbidden_system_fallback" });
  });

  it("rejects rename and delete on seed Categories", () => {
    expect(
      validateCategoryMutation(seed, { type: "rename", displayName: "Еда" }),
    ).toEqual({ ok: false, reason: "forbidden_seed" });
    expect(
      validateCategoryMutation(seed, { type: "delete" }, { isInUse: false }),
    ).toEqual({ ok: false, reason: "forbidden_seed" });
  });

  it("accepts hide and unhide for non-fallback seed", () => {
    expect(validateCategoryMutation(seed, { type: "hide" })).toEqual({
      ok: true,
    });
    expect(
      validateCategoryMutation({ ...seed, isHidden: true }, { type: "unhide" }),
    ).toEqual({ ok: true });
  });

  it("rejects delete when Category is referenced by an Expense", () => {
    expect(
      validateCategoryMutation(user, { type: "delete" }, { isInUse: true }),
    ).toEqual({ ok: false, reason: "in_use" });
  });

  it("accepts rename and delete for unused user-defined Category", () => {
    expect(
      validateCategoryMutation(user, {
        type: "rename",
        displayName: "Спорт",
      }),
    ).toEqual({ ok: true });
    expect(
      validateCategoryMutation(user, { type: "delete" }, { isInUse: false }),
    ).toEqual({ ok: true });
  });

  it("rejects empty rename/create display names", () => {
    expect(
      validateCategoryMutation(user, { type: "rename", displayName: "  " }),
    ).toEqual({ ok: false, reason: "invalid_name" });
    expect(
      validateCategoryMutation(null, { type: "create", displayName: "" }),
    ).toEqual({ ok: false, reason: "invalid_name" });
  });

  it("rejects create with duplicate name (case-insensitive)", () => {
    expect(
      validateCategoryMutation(
        null,
        { type: "create", displayName: "хобби" },
        {
          existing: [
            { id: "u1", displayName: "Хобби" },
            { id: "s1", displayName: "Продукты" },
          ],
        },
      ),
    ).toEqual({ ok: false, reason: "duplicate_name" });
  });

  it("allows rename to the same name (same Category)", () => {
    expect(
      validateCategoryMutation(
        user,
        { type: "rename", displayName: "хобби" },
        {
          existing: [
            { id: "u1", displayName: "Хобби" },
            { id: "s1", displayName: "Продукты" },
          ],
        },
      ),
    ).toEqual({ ok: true });
  });
});
