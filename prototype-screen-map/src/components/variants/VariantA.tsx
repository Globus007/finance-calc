"use client";

/**
 * Variant A — Dashboard + big mic FAB
 * Pinterest fintech visual language (soft lavender, white cards, blue primary).
 * Home = balance + last history. Bottom: Home | capture dock (C) | Month.
 * Capture dock = photo · big mic · manual (voice primary).
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
import {
  IconArrowDownLeft,
  IconArrowLeft,
  IconArrowUpRight,
  IconCamera,
  IconChart,
  IconHome,
  IconMic,
  IconPen,
  IconTags,
} from "../icons";

type Screen =
  | { name: "home" }
  | { name: "history" }
  | { name: "month" }
  | { name: "categories" }
  | { name: "manual-type" }
  | {
      name: "confirm";
      kind: Kind;
      channel: "photo" | "voice" | "manual";
      prefill?: Partial<HistoryItem>;
    }
  | { name: "capturing"; channel: "photo" | "voice" };

export function VariantA() {
  const [screen, setScreen] = useState<Screen>({ name: "home" });
  const [tab, setTab] = useState<"home" | "month">("home");
  const [items, setItems] = useState(HISTORY);
  const totals = useMemo(() => monthTotals(items), [items]);

  const goTab = (t: "home" | "month") => {
    setTab(t);
    setScreen(t === "home" ? { name: "home" } : { name: "month" });
  };

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
    }, 900);
  };

  const commit = (draft: {
    kind: Kind;
    amount: number;
    occurredOn: string;
    category?: string;
    note?: string;
    channel: "photo" | "voice" | "manual";
  }) => {
    setItems((prev) => [{ id: String(Date.now()), ...draft }, ...prev]);
    setScreen({ name: "home" });
    setTab("home");
  };

  const backToTab = () =>
    setScreen(tab === "home" ? { name: "home" } : { name: "month" });

  const showNav = ![
    "confirm",
    "capturing",
    "manual-type",
    "categories",
    "history",
  ].includes(screen.name);

  return (
    <PhoneFrame chrome="A · Dashboard + dock из C">
      <div className="relative flex h-full flex-col bg-[#F3F0FA] text-[#1A1B2E]">
        {/* soft ambient blobs */}
        <div className="pointer-events-none absolute -right-10 -top-8 h-40 w-40 rounded-full bg-[#C4B5FD]/35 blur-3xl" />
        <div className="pointer-events-none absolute -left-8 top-40 h-32 w-32 rounded-full bg-[#93C5FD]/25 blur-3xl" />

        <div className="relative min-h-0 flex-1 overflow-y-auto">
          {screen.name === "home" && (
            <HomeScreen
              items={items}
              totals={totals}
              onCategories={() => setScreen({ name: "categories" })}
              onSeeAll={() => {
                setTab("home");
                setScreen({ name: "history" });
              }}
            />
          )}
          {screen.name === "history" && (
            <HistoryScreen
              items={items}
              onBack={() => goTab("home")}
            />
          )}
          {screen.name === "month" && <MonthScreen totals={totals} items={items} />}
          {screen.name === "categories" && (
            <CategoriesScreen onBack={backToTab} />
          )}
          {screen.name === "manual-type" && (
            <ManualType
              onBack={backToTab}
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
              onDiscard={backToTab}
              onCommit={commit}
            />
          )}
        </div>

        {showNav && (
          <nav className="relative z-10 border-t border-white/60 bg-white/90 px-2 pb-3 pt-2 backdrop-blur-md">
            <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-1">
              <NavItem
                active={tab === "home" && screen.name === "home"}
                label="Домой"
                onClick={() => goTab("home")}
                icon={<IconHome size={20} />}
              />
              {/* capture dock from Variant C: photo · big mic · manual */}
              <div className="-mt-8 flex items-center gap-1.5 rounded-full border border-white/80 bg-white p-1.5 shadow-[0_12px_40px_-8px_rgba(26,27,46,0.25)]">
                <button
                  type="button"
                  onClick={() => startChannel("photo")}
                  className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-[#FF8A4C] transition hover:bg-[#FFF7ED] active:scale-95"
                  aria-label="Фото чека"
                >
                  <IconCamera size={20} />
                </button>
                <button
                  type="button"
                  onClick={() => startChannel("voice")}
                  className="flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-gradient-to-br from-[#5B6CFF] to-[#4338CA] text-white shadow-lg shadow-[#5B6CFF]/40 transition active:scale-95"
                  aria-label="Голосовая запись"
                >
                  <IconMic size={26} />
                </button>
                <button
                  type="button"
                  onClick={() => startChannel("manual")}
                  className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-[#A78BFA] transition hover:bg-[#F5F3FF] active:scale-95"
                  aria-label="Вручную"
                >
                  <IconPen size={20} />
                </button>
              </div>
              <NavItem
                active={tab === "month" && screen.name === "month"}
                label="Месяц"
                onClick={() => goTab("month")}
                icon={<IconChart size={20} />}
              />
            </div>
          </nav>
        )}

        <StateStrip
          label={`screen=${screen.name} · tab=${tab} · items=${items.length}`}
        />
      </div>
    </PhoneFrame>
  );
}

function NavItem({
  active,
  label,
  onClick,
  icon,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex cursor-pointer flex-col items-center gap-0.5 py-1 transition ${
        active ? "text-[#5B6CFF]" : "text-[#1A1B2E]/40"
      }`}
    >
      {icon}
      <span className="text-[10px] font-semibold">{label}</span>
    </button>
  );
}

function HomeScreen({
  items,
  totals,
  onCategories,
  onSeeAll,
}: {
  items: HistoryItem[];
  totals: { expense: number; income: number; net: number };
  onCategories: () => void;
  onSeeAll: () => void;
}) {
  const recent = items.slice(0, 4);

  return (
    <div className="px-4 pb-6 pt-2">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#5B6CFF] to-[#818CF8] text-sm font-bold text-white shadow-md shadow-[#5B6CFF]/30">
            А
          </div>
          <div>
            <p className="text-xs text-[#1A1B2E]/45">Привет</p>
            <p className="text-base font-semibold tracking-tight">Финансы</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onCategories}
          className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-white text-[#5B6CFF] shadow-sm shadow-black/5 transition active:scale-95"
          aria-label="Категории"
        >
          <IconTags size={18} />
        </button>
      </header>

      {/* balance card — Pinterest style */}
      <div className="relative mt-5 overflow-hidden rounded-[1.75rem] bg-white px-5 py-6 shadow-[0_10px_40px_-12px_rgba(91,108,255,0.18)]">
        <div className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-[#E0E7FF]" />
        <div className="pointer-events-none absolute -bottom-8 left-10 h-24 w-24 rounded-full bg-[#F3E8FF]" />
        <p className="relative text-xs font-medium text-[#1A1B2E]/45">
          Нетто · август
        </p>
        <p className="relative mt-1 text-[2rem] font-bold tracking-tight tabular-nums">
          {totals.net >= 0 ? "" : "−"}
          {byn(Math.abs(totals.net))}
        </p>
        <div className="relative mt-4 flex gap-6">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-[#1A1B2E]/35">
              Доходы
            </p>
            <p className="mt-0.5 text-sm font-semibold tabular-nums text-[#10B981]">
              +{byn(totals.income)}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-[#1A1B2E]/35">
              Расходы
            </p>
            <p className="mt-0.5 text-sm font-semibold tabular-nums text-[#F97316]">
              −{byn(totals.expense)}
            </p>
          </div>
        </div>
      </div>

      {/* last transactions — capture lives in bottom dock (from C) */}
      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-base font-bold tracking-tight">Последние</h2>
        <button
          type="button"
          onClick={onSeeAll}
          className="cursor-pointer text-xs font-semibold text-[#5B6CFF]"
        >
          Все
        </button>
      </div>
      <ul className="mt-3 space-y-2">
        {recent.map((item) => (
          <TxRow key={item.id} item={item} />
        ))}
      </ul>
    </div>
  );
}

function TxRow({ item }: { item: HistoryItem }) {
  const isIncome = item.kind === "income";
  return (
    <li className="flex items-center gap-3 rounded-2xl bg-white px-3 py-3 shadow-[0_4px_16px_-8px_rgba(26,27,46,0.12)]">
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
          isIncome ? "bg-[#D1FAE5] text-[#059669]" : "bg-[#FFEDD5] text-[#EA580C]"
        }`}
      >
        {isIncome ? (
          <IconArrowDownLeft size={18} />
        ) : (
          <IconArrowUpRight size={18} />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">
          {isIncome ? item.note || "Доход" : item.category || "Расход"}
        </p>
        <p className="truncate text-[11px] text-[#1A1B2E]/40">
          {shortDate(item.occurredOn)}
          {item.note && !isIncome ? ` · ${item.note}` : ""}
          {` · ${item.channel}`}
        </p>
      </div>
      <p
        className={`shrink-0 text-sm font-bold tabular-nums ${
          isIncome ? "text-[#059669]" : "text-[#1A1B2E]"
        }`}
      >
        {isIncome ? "+" : "−"}
        {byn(item.amount)}
      </p>
    </li>
  );
}

function HistoryScreen({
  items,
  onBack,
}: {
  items: HistoryItem[];
  onBack: () => void;
}) {
  return (
    <div className="px-4 pb-4 pt-3">
      <button
        type="button"
        onClick={onBack}
        className="flex cursor-pointer items-center gap-1 text-xs font-semibold text-[#5B6CFF]"
      >
        <IconArrowLeft size={14} /> Домой
      </button>
      <p className="mt-2 text-xs font-medium text-[#5B6CFF]">Август 2026</p>
      <h1 className="mt-0.5 text-2xl font-bold tracking-tight">История</h1>
      <ul className="mt-4 space-y-2">
        {items.map((item) => (
          <TxRow key={item.id} item={item} />
        ))}
      </ul>
    </div>
  );
}

function MonthScreen({
  totals,
  items,
}: {
  totals: { expense: number; income: number; net: number };
  items: HistoryItem[];
}) {
  const max = Math.max(totals.expense, totals.income, 1);
  const expH = Math.round((totals.expense / max) * 100);
  const incH = Math.round((totals.income / max) * 100);

  return (
    <div className="px-4 pb-4 pt-3">
      <button
        type="button"
        className="mb-2 flex cursor-pointer items-center gap-1 text-xs font-semibold text-[#5B6CFF]"
      >
        <IconArrowLeft size={14} /> Август
      </button>
      <h1 className="text-2xl font-bold tracking-tight">Итог месяца</h1>

      <div className="mt-4 rounded-[1.75rem] bg-white p-5 shadow-[0_10px_40px_-12px_rgba(91,108,255,0.15)]">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-[#1A1B2E]/45">Нетто</p>
            <p className="mt-1 text-3xl font-bold tabular-nums">
              {totals.net >= 0 ? "+" : ""}
              {byn(totals.net)}
            </p>
          </div>
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
              totals.net >= 0
                ? "bg-[#D1FAE5] text-[#059669]"
                : "bg-[#FEE2E2] text-[#DC2626]"
            }`}
          >
            {totals.net >= 0 ? "плюс" : "минус"}
          </span>
        </div>

        {/* mini bars — income / expense like ref chart */}
        <div className="mt-6 flex h-28 items-end justify-center gap-8">
          <div className="flex flex-col items-center gap-2">
            <div
              className="w-12 rounded-t-xl bg-[#5B6CFF] transition-all"
              style={{ height: `${Math.max(incH, 12)}%` }}
            />
            <span className="text-[10px] font-medium text-[#1A1B2E]/45">
              Доход
            </span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div
              className="w-12 rounded-t-xl bg-[#FF8A4C] transition-all"
              style={{ height: `${Math.max(expH, 12)}%` }}
            />
            <span className="text-[10px] font-medium text-[#1A1B2E]/45">
              Расход
            </span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-[#EEF2FF] px-3 py-3">
            <p className="text-[10px] font-medium uppercase tracking-wider text-[#5B6CFF]">
              Доходы
            </p>
            <p className="mt-1 text-sm font-bold tabular-nums">
              {byn(totals.income)}
            </p>
          </div>
          <div className="rounded-2xl bg-[#FFF7ED] px-3 py-3">
            <p className="text-[10px] font-medium uppercase tracking-wider text-[#F97316]">
              Расходы
            </p>
            <p className="mt-1 text-sm font-bold tabular-nums">
              {byn(totals.expense)}
            </p>
          </div>
        </div>
      </div>

      <p className="mt-4 text-center text-[11px] text-[#1A1B2E]/40">
        {items.filter((i) => i.occurredOn.startsWith("2026-08")).length} записей
        · только committed · live
      </p>
    </div>
  );
}

function CategoriesScreen({ onBack }: { onBack: () => void }) {
  return (
    <div className="px-4 pt-3">
      <button
        type="button"
        onClick={onBack}
        className="flex cursor-pointer items-center gap-1 text-xs font-semibold text-[#5B6CFF]"
      >
        <IconArrowLeft size={14} /> Назад
      </button>
      <h1 className="mt-2 text-2xl font-bold">Категории</h1>
      <p className="mt-1 text-xs text-[#1A1B2E]/45">
        Скрытые не в picker. «Прочее» — system fallback.
      </p>
      <ul className="mt-4 space-y-2">
        {CATEGORIES.map((c) => (
          <li
            key={c.id}
            className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 shadow-sm shadow-black/5"
          >
            <div>
              <p
                className={`text-sm font-semibold ${c.hidden ? "opacity-40 line-through" : ""}`}
              >
                {c.name}
              </p>
              <p className="text-[10px] uppercase tracking-wider text-[#1A1B2E]/35">
                {c.seed ? "seed" : "своя"}
                {c.hidden ? " · hidden" : ""}
              </p>
            </div>
            <span className="text-xs font-medium text-[#5B6CFF]">
              {c.hidden ? "Показать" : "Скрыть"}
            </span>
          </li>
        ))}
      </ul>
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
        className="flex cursor-pointer items-center gap-1 self-start text-xs font-semibold text-[#5B6CFF]"
      >
        <IconArrowLeft size={14} /> Каналы
      </button>
      <h1 className="mt-6 text-2xl font-bold">Что записываем?</h1>
      <div className="mt-6 grid gap-3">
        <button
          type="button"
          onClick={() => onPick("expense")}
          className="cursor-pointer rounded-[1.5rem] bg-[#1A1B2E] px-5 py-6 text-left text-white transition active:scale-[0.99]"
        >
          <p className="text-lg font-semibold">Расход</p>
          <p className="mt-1 text-xs text-white/50">Нужна категория</p>
        </button>
        <button
          type="button"
          onClick={() => onPick("income")}
          className="cursor-pointer rounded-[1.5rem] bg-gradient-to-br from-[#5B6CFF] to-[#4338CA] px-5 py-6 text-left text-white transition active:scale-[0.99]"
        >
          <p className="text-lg font-semibold">Доход</p>
          <p className="mt-1 text-xs text-white/70">Без категории</p>
        </button>
      </div>
    </div>
  );
}

function Capturing({ channel }: { channel: "photo" | "voice" }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 bg-gradient-to-b from-[#5B6CFF] to-[#312E81] text-white">
      <div className="relative flex h-28 w-28 items-center justify-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-white/20" />
        <span className="relative flex h-24 w-24 items-center justify-center rounded-full bg-white/15 ring-4 ring-white/30">
          {channel === "voice" ? <IconMic size={40} /> : <IconCamera size={40} />}
        </span>
      </div>
      <p className="text-base font-semibold">
        {channel === "photo" ? "Читаем чек…" : "Слушаем…"}
      </p>
      <p className="max-w-[14rem] text-center text-[11px] text-white/60">
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
    <div className="flex h-full flex-col bg-[#F3F0FA]">
      <header className="flex items-center justify-between px-4 pt-3">
        <button
          type="button"
          onClick={onDiscard}
          className="cursor-pointer text-xs font-semibold text-[#1A1B2E]/45"
        >
          Отменить
        </button>
        <p className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#5B6CFF]">
          {channel} · draft
        </p>
        <span className="w-14" />
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-3">
        <h1 className="text-2xl font-bold">Подтверждение</h1>
        {channel !== "photo" && (
          <div className="mt-3 flex gap-2">
            {(["expense", "income"] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setK(opt)}
                className={`flex-1 cursor-pointer rounded-xl py-2.5 text-xs font-bold transition ${
                  k === opt
                    ? "bg-[#5B6CFF] text-white shadow-md shadow-[#5B6CFF]/30"
                    : "bg-white text-[#1A1B2E]/45"
                }`}
              >
                {opt === "expense" ? "Расход" : "Доход"}
              </button>
            ))}
          </div>
        )}
        <label className="mt-5 block text-[10px] font-bold uppercase tracking-wider text-[#1A1B2E]/40">
          Сумма (BYN)
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
            className="mt-1.5 w-full rounded-2xl border-0 bg-white px-4 py-3.5 text-xl font-bold tabular-nums outline-none ring-1 ring-[#1A1B2E]/8 focus:ring-2 focus:ring-[#5B6CFF]"
          />
        </label>
        <label className="mt-3 block text-[10px] font-bold uppercase tracking-wider text-[#1A1B2E]/40">
          Дата
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1.5 w-full rounded-2xl border-0 bg-white px-4 py-3 text-sm outline-none ring-1 ring-[#1A1B2E]/8 focus:ring-2 focus:ring-[#5B6CFF]"
          />
        </label>
        {k === "expense" && (
          <label className="mt-3 block text-[10px] font-bold uppercase tracking-wider text-[#1A1B2E]/40">
            Категория
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1.5 w-full rounded-2xl border-0 bg-white px-4 py-3 text-sm outline-none ring-1 ring-[#1A1B2E]/8 focus:ring-2 focus:ring-[#5B6CFF]"
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
        <label className="mt-3 block text-[10px] font-bold uppercase tracking-wider text-[#1A1B2E]/40">
          Заметка
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="mt-1.5 w-full rounded-2xl border-0 bg-white px-4 py-3 text-sm outline-none ring-1 ring-[#1A1B2E]/8 focus:ring-2 focus:ring-[#5B6CFF]"
          />
        </label>
      </div>
      <div className="px-4 pb-5 pt-2">
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
          className="w-full cursor-pointer rounded-2xl bg-gradient-to-r from-[#5B6CFF] to-[#4F46E5] py-4 text-sm font-bold text-white shadow-lg shadow-[#5B6CFF]/35 transition active:scale-[0.99] disabled:opacity-30"
        >
          Сохранить
        </button>
      </div>
    </div>
  );
}

function StateStrip({ label }: { label: string }) {
  return (
    <div className="border-t border-dashed border-[#5B6CFF]/25 bg-[#1A1B2E] px-3 py-1.5 font-mono text-[10px] text-[#A5B4FC]">
      state · {label}
    </div>
  );
}
