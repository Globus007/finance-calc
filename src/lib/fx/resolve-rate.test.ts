import { describe, expect, it, vi } from "vitest";
import {
  resolveEffectiveRate,
  type ResolveRateDeps,
} from "./resolve-rate";
import type { FxState } from "./types";

const NOW = new Date("2026-02-12T12:00:00.000Z");
const DAY_MS = 24 * 60 * 60 * 1000;

function base(overrides: Partial<ResolveRateDeps> = {}): ResolveRateDeps {
  return {
    state: null,
    now: NOW,
    fetchNbrbRate: async () => 3.3012,
    ...overrides,
  };
}

describe("resolveEffectiveRate", () => {
  it("override wins over anything else", async () => {
    const state: FxState = {
      cachedRate: 3,
      cachedAt: "2026-02-12T11:00:00.000Z",
      overrideRate: 3.35,
      overrideAt: "2026-02-10T09:00:00.000Z",
    };
    const fetchNbrbRate = vi.fn(async () => 3.4);
    const result = await resolveEffectiveRate(base({ state, fetchNbrbRate }));

    expect(result).toEqual({
      rate: 3.35,
      source: "override",
      asOf: "2026-02-10T09:00:00.000Z",
    });
    expect(fetchNbrbRate).not.toHaveBeenCalled();
  });

  it("fresh cache is used without a fetch", async () => {
    const state: FxState = {
      cachedRate: 3.3,
      cachedAt: new Date(NOW.getTime() - DAY_MS / 2).toISOString(),
      overrideRate: null,
      overrideAt: null,
    };
    const fetchNbrbRate = vi.fn(async () => 3.4);
    const result = await resolveEffectiveRate(base({ state, fetchNbrbRate }));

    expect(result).toEqual({
      rate: 3.3,
      source: "nbrb",
      asOf: state.cachedAt,
    });
    expect(fetchNbrbRate).not.toHaveBeenCalled();
  });

  it("stale cache triggers a lazy fetch and persists the fresh rate", async () => {
    const state: FxState = {
      cachedRate: 3.1,
      cachedAt: new Date(NOW.getTime() - DAY_MS - 1).toISOString(),
      overrideRate: null,
      overrideAt: null,
    };
    const saveCache = vi.fn(async () => {});
    const result = await resolveEffectiveRate(base({ state, saveCache }));

    expect(result).toEqual({ rate: 3.3012, source: "nbrb", asOf: NOW.toISOString() });
    expect(saveCache).toHaveBeenCalledWith(3.3012, NOW);
  });

  it("NBRB failure falls back to the last (stale) cache", async () => {
    const state: FxState = {
      cachedRate: 3.1,
      cachedAt: new Date(NOW.getTime() - 5 * DAY_MS).toISOString(),
      overrideRate: null,
      overrideAt: null,
    };
    const result = await resolveEffectiveRate(
      base({ state, fetchNbrbRate: async () => null }),
    );

    expect(result).toEqual({ rate: 3.1, source: "nbrb", asOf: state.cachedAt });
  });

  it("first use with empty cache and unreachable NBRB yields no rate", async () => {
    const result = await resolveEffectiveRate(
      base({ fetchNbrbRate: async () => null }),
    );
    expect(result).toBeNull();
  });
});
