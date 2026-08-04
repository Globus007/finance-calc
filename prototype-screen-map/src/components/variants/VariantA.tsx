"use client";

/**
 * Variant A — Tabs + FAB
 * Bottom tabs: History | (center FAB) | Month. Categories via header gear.
 * Capture opens action sheet; confirm is full-screen. Classic mobile banking IA.
 */

import { useMemo, useState } from "react";
import {
  byn,
  CATEGORIES,
  HISTORY,
  monthTotals,
  shortDate,
  type HistoryItem,
  type Kind,
} from "../../lib/mock-data";
import { PhoneFrame } from "../PhoneFrame";

type Screen =
  | { name: "history" }
  | { name: "month" }
  | { name: "categories" }
  | { name: "capture-sheet" }
  | { name: "manual-type" }
  | {
      name: "confirm";
      kind: Kind;
      channel: "photo" | "voice" | "manual";
      prefill?: Partial<HistoryItem>;
    }
  | { name: "capturing"; channel: "photo" | "voice" };

export function VariantA() {
  const [screen, setScreen] = useState<Screen>({ name: "history" });
  const [tab, setTab] = useState<"history" | "month">("history");
  const [items, setItems] = useState(HISTORY);
  const totals = useMemo(() => monthTotals(items), [items]);

  const goTab = (t: "history" | "month") => {
    setTab(t);
    setScreen(t === "history" ? { name: "history" } : { name: "month" });
  };

  const openCapture = () => setScreen({ name: "capture-sheet" });

  const startChannel = (channel: "photo" | "voice" | "manual") => {
    if (channel === "manual") {
      setScreen({ name: "manual-type" });
      return;
    }
    setScreen({ name: "capturing", channel });
    window.setTimeout(() => {
      setScreen({
        name: "confirm",
        kind: "expense",
        channel,
        prefill:
          channel === "photo"
            ? {
                amount: 48.2,
                category: "Продукты",
                note: "Евроопт",
                occurredOn: "2026-08-04",
              }
            : {
                amount: 12.5,
                category: "Кафе",
                note: "Кофе",
                occurredOn: "2026-08-04",
              },
      });
    }, 700);
  };

  const commit = (draft: {
    kind: Kind;
    amount: number;
    occurredOn: string;
    category?: string;
    note?: string;
    channel: "photo" | "voice" | "manual";
  }) => {
    setItems((prev) => [
      {
        id: String(Date.now()),
        ...draft,
      },
      ...prev,
    ]);
    setScreen({ name: "history" });
    setTab("history");
  };

  return (
    <PhoneFrame chrome="A · Вкладки + FAB">
      <div className="flex h-full flex-col bg-[#F3EFE6] text-[#1C1915]">
        {/* body */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {screen.name === "history" && (
            <HistoryScreen
              items={items}
              onCategories={() => setScreen({ name: "categories" })}
            />
          )}
          {screen.name === "month" && <MonthScreen totals={totals} />}
          {screen.name === "categories" && (
            <CategoriesScreen
              onBack={() =>
                setScreen(
                  tab === "history" ? { name: "history" } : { name: "month" },
                )
              }
            />
          )}
          {screen.name === "capture-sheet" && (
            <CaptureSheet
              onClose={() =>
                setScreen(
                  tab === "history" ? { name: "history" } : { name: "month" },
                )
              }
              onPick={startChannel}
            />
          )}
          {screen.name === "manual-type" && (
            <ManualType
              onBack={() => setScreen({ name: "capture-sheet" })}
              onPick={(kind) =>
                setScreen({
                  name: "confirm",
                  kind,
                  channel: "manual",
                  prefill: { occurredOn: "2026-08-04" },
                })
              }
            />
          )}
          {screen.name === "capturing" && (
            <Capturing channel={screen.channel} />
          )}
          {screen.name === "confirm" && (
            <ConfirmScreen
              kind={screen.kind}
              channel={screen.channel}
              prefill={screen.prefill}
              onDiscard={() =>
                setScreen(
                  tab === "history" ? { name: "history" } : { name: "month" },
                )
              }
              onCommit={commit}
            />
          )}
        </div>

        {/* tab bar — hidden on confirm / capture overlays */}
        {!["confirm", "capturing", "manual-type", "categories"].includes(
          screen.name,
        ) && (
          <nav className="relative grid grid-cols-3 border-t border-[#1C1915]/10 bg-[#F3EFE6] px-2 pb-3 pt-2">
            <TabBtn
              active={tab === "history" && screen.name === "history"}
              label="История"
              onClick={() => goTab("history")}
            />
            <div className="flex justify-center">
              <button
                type="button"
                onClick={openCapture}
                className="-mt-7 flex h-14 w-14 items-center justify-center rounded-full bg-[#0D7377] text-2xl font-light text-white shadow-lg shadow-[#0D7377]/40"
                aria-label="Записать"
              >
                +
              </button>
            </div>
            <TabBtn
              active={tab === "month" && screen.name === "month"}
              label="Месяц"
              onClick={() => goTab("month")}
            />
          </nav>
        )}

        <StateStrip
          label={`screen=${screen.name} · tab=${tab} · items=${items.length}`}
        />
      </div>
    </PhoneFrame>
  );
}

function TabBtn({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`py-2 text-xs font-semibold tracking-wide ${
        active ? "text-[#0D7377]" : "text-[#1C1915]/45"
      }`}
    >
      {label}
    </button>
  );
}

function HistoryScreen({
  items,
  onCategories,
}: {
  items: HistoryItem[];
  onCategories: () => void;
}) {
  return (
    <div>
      <header className="flex items-center justify-between px-4 pb-2 pt-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#0D7377]">
            Финансы
          </p>
          <h1 className="font-serif text-2xl tracking-tight">История</h1>
        </div>
        <button
          type="button"
          onClick={onCategories}
          className="rounded-full border border-[#1C1915]/15 px-3 py-1.5 text-xs font-medium"
        >
          Категории
        </button>
      </header>
      <ul className="divide-y divide-[#1C1915]/8 px-2">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-3 px-2 py-3">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-full text-sm ${
                item.kind === "income"
                  ? "bg-[#0D7377]/15 text-[#0D7377]"
                  : "bg-[#1C1915]/8 text-[#1C1915]"
              }`}
            >
              {item.kind === "income" ? "↓" : "↑"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {item.kind === "income"
                  ? item.note || "Доход"
                  : item.category || "Расход"}
              </p>
              <p className="text-xs text-[#1C1915]/50">
                {shortDate(item.occurredOn)}
                {item.note && item.kind === "expense" ? ` · ${item.note}` : ""}
              </p>
            </div>
            <p
              className={`text-sm font-semibold tabular-nums ${
                item.kind === "income" ? "text-[#0D7377]" : ""
              }`}
            >
              {item.kind === "income" ? "+" : "−"}
              {byn(item.amount)}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MonthScreen({
  totals,
}: {
  totals: { expense: number; income: number; net: number; ym: string };
}) {
  return (
    <div className="px-4 pt-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#0D7377]">
        Август 2026
      </p>
      <h1 className="font-serif text-2xl tracking-tight">Итог месяца</h1>
      <div className="mt-6 space-y-3">
        <StatCard label="Расходы" value={byn(totals.expense)} muted />
        <StatCard label="Доходы" value={byn(totals.income)} />
        <div className="rounded-2xl bg-[#1C1915] px-4 py-5 text-[#F3EFE6]">
          <p className="text-xs uppercase tracking-widest text-white/50">
            Нетто
          </p>
          <p className="mt-1 font-serif text-3xl tabular-nums">
            {totals.net >= 0 ? "+" : ""}
            {byn(totals.net)}
          </p>
        </div>
      </div>
      <p className="mt-6 text-xs leading-relaxed text-[#1C1915]/50">
        Только committed записи. Черновики не входят. Пересчёт live при Edit /
        Delete.
      </p>
    </div>
  );
}

function StatCard({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl px-4 py-4 ${
        muted ? "bg-white/60" : "bg-[#0D7377]/10"
      }`}
    >
      <p className="text-xs uppercase tracking-widest text-[#1C1915]/45">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function CategoriesScreen({ onBack }: { onBack: () => void }) {
  return (
    <div className="px-4 pt-3">
      <button
        type="button"
        onClick={onBack}
        className="text-xs font-semibold text-[#0D7377]"
      >
        ← Назад
      </button>
      <h1 className="mt-2 font-serif text-2xl">Категории</h1>
      <p className="mt-1 text-xs text-[#1C1915]/50">
        Скрытые не в picker и не в auto-map. «Прочее» — system fallback.
      </p>
      <ul className="mt-4 space-y-2">
        {CATEGORIES.map((c) => (
          <li
            key={c.id}
            className="flex items-center justify-between rounded-xl bg-white/70 px-3 py-2.5"
          >
            <div>
              <p className="text-sm font-medium">{c.name}</p>
              <p className="text-[10px] uppercase tracking-wider text-[#1C1915]/40">
                {c.seed ? "seed" : "своя"}
                {c.hidden ? " · hidden" : ""}
              </p>
            </div>
            <span className="text-xs text-[#1C1915]/40">
              {c.hidden ? "Показать" : "Скрыть"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CaptureSheet({
  onClose,
  onPick,
}: {
  onClose: () => void;
  onPick: (c: "photo" | "voice" | "manual") => void;
}) {
  return (
    <div className="flex h-full flex-col justify-end bg-[#1C1915]/35">
      <button type="button" className="flex-1" onClick={onClose} aria-label="Close" />
      <div className="rounded-t-3xl bg-[#F3EFE6] px-4 pb-8 pt-4 shadow-2xl">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[#1C1915]/15" />
        <h2 className="font-serif text-xl">Записать</h2>
        <p className="mt-1 text-xs text-[#1C1915]/50">
          Photo → Expense. Voice / manual → Expense или Income.
        </p>
        <div className="mt-4 space-y-2">
          {(
            [
              ["photo", "📷  Фото чека", "Только расход"],
              ["voice", "🎙  Голос", "Расход или доход"],
              ["manual", "✎  Вручную", "Расход или доход"],
            ] as const
          ).map(([key, title, sub]) => (
            <button
              key={key}
              type="button"
              onClick={() => onPick(key)}
              className="flex w-full items-center justify-between rounded-2xl border border-[#1C1915]/10 bg-white px-4 py-3 text-left"
            >
              <span className="text-sm font-medium">{title}</span>
              <span className="text-[11px] text-[#1C1915]/45">{sub}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ManualType({
  onBack,
  onPick,
}: {
  onBack: () => void;
  onPick: (k: Kind) => void;
}) {
  return (
    <div className="flex h-full flex-col px-4 pt-4">
      <button
        type="button"
        onClick={onBack}
        className="self-start text-xs font-semibold text-[#0D7377]"
      >
        ← Каналы
      </button>
      <h1 className="mt-6 font-serif text-2xl">Что записываем?</h1>
      <div className="mt-6 grid gap-3">
        <button
          type="button"
          onClick={() => onPick("expense")}
          className="rounded-2xl bg-[#1C1915] px-4 py-6 text-left text-[#F3EFE6]"
        >
          <p className="text-lg font-medium">Расход</p>
          <p className="mt-1 text-xs text-white/50">Нужна категория</p>
        </button>
        <button
          type="button"
          onClick={() => onPick("income")}
          className="rounded-2xl bg-[#0D7377] px-4 py-6 text-left text-white"
        >
          <p className="text-lg font-medium">Доход</p>
          <p className="mt-1 text-xs text-white/70">Без категории</p>
        </button>
      </div>
    </div>
  );
}

function Capturing({ channel }: { channel: "photo" | "voice" }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 bg-[#1C1915] text-[#F3EFE6]">
      <div className="h-12 w-12 animate-pulse rounded-full bg-[#0D7377]" />
      <p className="text-sm">
        {channel === "photo" ? "Читаем чек…" : "Слушаем…"}
      </p>
      <p className="text-[11px] text-white/40">
        Медиа ephemeral — после extract не хранится
      </p>
    </div>
  );
}

function ConfirmScreen({
  kind,
  channel,
  prefill,
  onDiscard,
  onCommit,
}: {
  kind: Kind;
  channel: "photo" | "voice" | "manual";
  prefill?: Partial<HistoryItem>;
  onDiscard: () => void;
  onCommit: (d: {
    kind: Kind;
    amount: number;
    occurredOn: string;
    category?: string;
    note?: string;
    channel: "photo" | "voice" | "manual";
  }) => void;
}) {
  const [amount, setAmount] = useState(String(prefill?.amount ?? ""));
  const [date, setDate] = useState(prefill?.occurredOn ?? "2026-08-04");
  const [category, setCategory] = useState(prefill?.category ?? "");
  const [note, setNote] = useState(prefill?.note ?? "");
  const [k, setK] = useState(kind);

  const canCommit =
    Number(amount) > 0 && date && (k === "income" || category.length > 0);

  return (
    <div className="flex h-full flex-col bg-[#F3EFE6]">
      <header className="flex items-center justify-between px-4 pt-3">
        <button
          type="button"
          onClick={onDiscard}
          className="text-xs font-semibold text-[#1C1915]/50"
        >
          Отменить
        </button>
        <p className="text-[10px] uppercase tracking-widest text-[#1C1915]/40">
          {channel} · draft
        </p>
        <button
          type="button"
          disabled={!canCommit}
          onClick={() =>
            onCommit({
              kind: k,
              amount: Number(amount),
              occurredOn: date,
              category: k === "expense" ? category : undefined,
              note: note || undefined,
              channel,
            })
          }
          className="text-xs font-bold text-[#0D7377] disabled:opacity-30"
        >
          Сохранить
        </button>
      </header>
      <div className="px-4 pt-4">
        <h1 className="font-serif text-2xl">Подтверждение</h1>
        {channel === "voice" && (
          <div className="mt-3 flex gap-2">
            {(["expense", "income"] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setK(opt)}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  k === opt
                    ? "bg-[#1C1915] text-[#F3EFE6]"
                    : "bg-white text-[#1C1915]/50"
                }`}
              >
                {opt === "expense" ? "Расход" : "Доход"}
              </button>
            ))}
          </div>
        )}
        <label className="mt-5 block text-[10px] uppercase tracking-widest text-[#1C1915]/40">
          Сумма (BYN)
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
            className="mt-1 w-full rounded-xl border border-[#1C1915]/10 bg-white px-3 py-3 text-lg font-semibold tabular-nums outline-none focus:border-[#0D7377]"
          />
        </label>
        <label className="mt-3 block text-[10px] uppercase tracking-widest text-[#1C1915]/40">
          Дата
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 w-full rounded-xl border border-[#1C1915]/10 bg-white px-3 py-3 text-sm outline-none focus:border-[#0D7377]"
          />
        </label>
        {k === "expense" && (
          <label className="mt-3 block text-[10px] uppercase tracking-widest text-[#1C1915]/40">
            Категория
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[#1C1915]/10 bg-white px-3 py-3 text-sm outline-none focus:border-[#0D7377]"
            >
              <option value="">Выберите…</option>
              {CATEGORIES.filter((c) => !c.hidden).map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="mt-3 block text-[10px] uppercase tracking-widest text-[#1C1915]/40">
          Заметка
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="mt-1 w-full rounded-xl border border-[#1C1915]/10 bg-white px-3 py-3 text-sm outline-none focus:border-[#0D7377]"
          />
        </label>
      </div>
    </div>
  );
}

function StateStrip({ label }: { label: string }) {
  return (
    <div className="border-t border-dashed border-[#1C1915]/15 bg-[#1C1915] px-3 py-1.5 font-mono text-[10px] text-amber-200/90">
      state · {label}
    </div>
  );
}
