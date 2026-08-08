"use client";

import { useMemo, useState } from "react";
import { HistoryList } from "@/components/history-list";
import type { CategoryPickerItem } from "@/lib/categories/types";
import {
  DEFAULT_HISTORY_FILTERS,
  filterHistory,
  hasActiveHistoryFilters,
  type HistoryFilterKind,
  type HistoryFilters,
} from "@/lib/money/filter-history";
import type { HistoryItem } from "@/lib/money/history-types";

const EMPTY_ALL =
  "Пока нет записей. Добавьте расход или доход через панель захвата.";
const EMPTY_FILTERED = "Нет записей по выбранным фильтрам.";

type Props = {
  items: HistoryItem[];
  categories: CategoryPickerItem[];
};

/**
 * History surface filters (kind, Category, Occurred on range) + list.
 * Filters are client-only over the load-all list; Edit/Delete links stay on rows.
 */
export function HistoryPanel({ items, categories }: Props) {
  const [filters, setFilters] = useState<HistoryFilters>(DEFAULT_HISTORY_FILTERS);

  const filtered = useMemo(
    () => filterHistory(items, filters),
    [items, filters],
  );
  const active = hasActiveHistoryFilters(filters);
  const emptyMessage =
    items.length === 0 ? EMPTY_ALL : active ? EMPTY_FILTERED : EMPTY_ALL;

  function setKind(kind: HistoryFilterKind) {
    setFilters((prev) => ({
      ...prev,
      kind,
      // Income has no Category — drop category when switching to Income only.
      categoryId: kind === "income" ? null : prev.categoryId,
    }));
  }

  function setCategoryId(categoryId: string) {
    setFilters((prev) => ({
      ...prev,
      categoryId: categoryId === "" ? null : categoryId,
    }));
  }

  function setFrom(from: string) {
    setFilters((prev) => ({
      ...prev,
      from: from === "" ? null : from,
    }));
  }

  function setTo(to: string) {
    setFilters((prev) => ({
      ...prev,
      to: to === "" ? null : to,
    }));
  }

  function clearFilters() {
    setFilters(DEFAULT_HISTORY_FILTERS);
  }

  const categoryDisabled = filters.kind === "income";
  const categorySelected = filters.categoryId != null && !categoryDisabled;

  return (
    <div>
      <section
        className="mt-4 rounded-2xl bg-white p-3 shadow-[0_4px_16px_-8px_rgba(26,27,46,0.12)]"
        aria-label="Фильтры истории"
      >
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#1A1B2E]/40">
          Тип
        </p>
        <div
          className="mt-1.5 grid grid-cols-3 gap-1 rounded-xl bg-[#F3F0FA] p-1"
          role="group"
          aria-label="Тип записи"
        >
          <KindButton
            active={filters.kind === "all"}
            onClick={() => setKind("all")}
            label="Все"
          />
          <KindButton
            active={filters.kind === "expense"}
            onClick={() => setKind("expense")}
            label="Расходы"
          />
          <KindButton
            active={filters.kind === "income"}
            onClick={() => setKind("income")}
            label="Доходы"
          />
        </div>

        <label className="mt-3 block text-[10px] font-bold uppercase tracking-wider text-[#1A1B2E]/40">
          Категория
          <select
            value={filters.categoryId ?? ""}
            onChange={(e) => setCategoryId(e.target.value)}
            disabled={categoryDisabled}
            className="mt-1.5 w-full rounded-xl border-0 bg-[#F3F0FA] px-3 py-2.5 text-sm outline-none ring-1 ring-[#1A1B2E]/8 focus:ring-2 focus:ring-[#5B6CFF] disabled:cursor-not-allowed disabled:opacity-45"
            aria-disabled={categoryDisabled}
          >
            <option value="">Все категории</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.displayName}
              </option>
            ))}
          </select>
        </label>
        {categoryDisabled ? (
          <p className="mt-1 text-[11px] text-[#1A1B2E]/40">
            У доходов нет категории.
          </p>
        ) : categorySelected ? (
          <p className="mt-1 text-[11px] text-[#1A1B2E]/40">
            Доходы скрыты: у них нет категории.
          </p>
        ) : null}

        <div className="mt-3 grid grid-cols-2 gap-2">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-[#1A1B2E]/40">
            С даты
            <input
              type="date"
              value={filters.from ?? ""}
              onChange={(e) => setFrom(e.target.value)}
              className="mt-1.5 w-full rounded-xl border-0 bg-[#F3F0FA] px-3 py-2.5 text-sm outline-none ring-1 ring-[#1A1B2E]/8 focus:ring-2 focus:ring-[#5B6CFF]"
            />
          </label>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-[#1A1B2E]/40">
            По дату
            <input
              type="date"
              value={filters.to ?? ""}
              onChange={(e) => setTo(e.target.value)}
              className="mt-1.5 w-full rounded-xl border-0 bg-[#F3F0FA] px-3 py-2.5 text-sm outline-none ring-1 ring-[#1A1B2E]/8 focus:ring-2 focus:ring-[#5B6CFF]"
            />
          </label>
        </div>
        <p className="mt-1 text-[11px] text-[#1A1B2E]/40">
          Календарные даты · Europe/Minsk
        </p>

        {active ? (
          <button
            type="button"
            onClick={clearFilters}
            className="mt-3 w-full cursor-pointer rounded-xl py-2 text-sm font-semibold text-[#5B6CFF] transition active:scale-[0.99]"
          >
            Сбросить фильтры
          </button>
        ) : null}
      </section>

      <HistoryList items={filtered} emptyMessage={emptyMessage} />
    </div>
  );
}

function KindButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`cursor-pointer rounded-lg py-2 text-xs font-semibold transition ${
        active
          ? "bg-white text-[#1A1B2E] shadow-sm"
          : "text-[#1A1B2E]/45 hover:text-[#1A1B2E]/70"
      }`}
    >
      {label}
    </button>
  );
}
