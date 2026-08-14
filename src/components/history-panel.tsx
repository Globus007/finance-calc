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
        className="ui-card mt-4 p-3"
        aria-label="Фильтры истории"
      >
        <p className="ui-kicker">Тип</p>
        <div
          className="mt-1.5 grid grid-cols-3 gap-1 rounded-lg bg-surface p-1"
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

        <label className="mt-3 block">
          <span className="ui-kicker">Категория</span>
          <select
            value={filters.categoryId ?? ""}
            onChange={(e) => setCategoryId(e.target.value)}
            disabled={categoryDisabled}
            className="ui-field mt-1.5 disabled:cursor-not-allowed disabled:opacity-45"
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
          <p className="mt-1 text-[11px] text-ink-muted">
            У доходов нет категории.
          </p>
        ) : categorySelected ? (
          <p className="mt-1 text-[11px] text-ink-muted">
            Доходы скрыты: у них нет категории.
          </p>
        ) : null}

        <div className="mt-3 grid grid-cols-2 gap-2">
          <label className="block">
            <span className="ui-kicker">С даты</span>
            <input
              type="date"
              value={filters.from ?? ""}
              onChange={(e) => setFrom(e.target.value)}
              className="ui-field mt-1.5"
            />
          </label>
          <label className="block">
            <span className="ui-kicker">По дату</span>
            <input
              type="date"
              value={filters.to ?? ""}
              onChange={(e) => setTo(e.target.value)}
              className="ui-field mt-1.5"
            />
          </label>
        </div>
        <p className="mt-1 text-[11px] text-ink-muted">
          Календарные даты · Europe/Minsk
        </p>

        {active ? (
          <button
            type="button"
            onClick={clearFilters}
            className="mt-3 w-full cursor-pointer rounded-control py-2 text-sm font-semibold text-brand transition active:scale-[0.99]"
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
      className={`cursor-pointer rounded-md py-2 text-xs font-semibold transition ${
        active
          ? "bg-surface-strong text-ink shadow-sm"
          : "text-ink-muted hover:text-ink"
      }`}
    >
      {label}
    </button>
  );
}
