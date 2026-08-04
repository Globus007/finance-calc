"use client";

/**
 * Variant B — Capture home
 * The home screen IS capture: three large channel tiles.
 * History, month, categories are secondary full-screen destinations from a slim top rail.
 * No bottom tabs — capture is the product, review is a detour.
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

type Dest =
  | "home"
  | "history"
  | "month"
  | "categories"
  | "manual-type"
  | "capturing"
  | "confirm";

export function VariantB() {
  const [dest, setDest] = useState<Dest>("home");
  const [channel, setChannel] = useState<"photo" | "voice" | "manual">("manual");
  const [kind, setKind] = useState<Kind>("expense");
  const [prefill, setPrefill] = useState<Partial<HistoryItem>>({});
  const [items, setItems] = useState(HISTORY);
  const totals = useMemo(() => monthTotals(items), [items]);

  const start = (ch: "photo" | "voice" | "manual") => {
    setChannel(ch);
    if (ch === "manual") {
      setDest("manual-type");
      return;
    }
    setDest("capturing");
    window.setTimeout(() => {
      setKind("expense");
      setPrefill(
        ch === "photo"
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
      );
      setDest("confirm");
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
    setItems((prev) => [{ id: String(Date.now()), ...draft }, ...prev]);
    setDest("home");
  };

  return (
    <PhoneFrame chrome="B · Захват — дом">
      <div className="flex h-full flex-col bg-[#0B0C0F] text-[#F5F0E6]">
        {dest === "home" && (
          <Home
            last={items[0]}
            onStart={start}
            onHistory={() => setDest("history")}
            onMonth={() => setDest("month")}
            onCategories={() => setDest("categories")}
          />
        )}
        {dest === "history" && (
          <ListScreen
            title="История"
            onBack={() => setDest("home")}
            items={items}
          />
        )}
        {dest === "month" && (
          <MonthFull totals={totals} onBack={() => setDest("home")} />
        )}
        {dest === "categories" && (
          <Cats onBack={() => setDest("home")} />
        )}
        {dest === "manual-type" && (
          <PickType
            onBack={() => setDest("home")}
            onPick={(k) => {
              setKind(k);
              setPrefill({ occurredOn: "2026-08-04" });
              setDest("confirm");
            }}
          />
        )}
        {dest === "capturing" && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3">
            <div className="h-16 w-16 animate-pulse rounded-full border-2 border-[#E8B86D]" />
            <p className="text-sm text-[#E8B86D]">Извлечение…</p>
          </div>
        )}
        {dest === "confirm" && (
          <ConfirmB
            kind={kind}
            channel={channel}
            prefill={prefill}
            onDiscard={() => setDest("home")}
            onSwitchKind={setKind}
            onCommit={commit}
          />
        )}
        <div className="border-t border-white/10 bg-black px-3 py-1.5 font-mono text-[10px] text-[#E8B86D]/90">
          state · dest={dest} · channel={channel} · kind={kind} · n={items.length}
        </div>
      </div>
    </PhoneFrame>
  );
}

function Home({
  last,
  onStart,
  onHistory,
  onMonth,
  onCategories,
}: {
  last?: HistoryItem;
  onStart: (c: "photo" | "voice" | "manual") => void;
  onHistory: () => void;
  onMonth: () => void;
  onCategories: () => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col px-4 pb-4 pt-2">
      <header className="flex items-center justify-between">
        <p className="font-serif text-lg italic text-[#E8B86D]">ledger</p>
        <div className="flex gap-3 text-[11px] font-medium uppercase tracking-wider text-white/45">
          <button type="button" onClick={onHistory} className="hover:text-white">
            История
          </button>
          <button type="button" onClick={onMonth} className="hover:text-white">
            Месяц
          </button>
          <button
            type="button"
            onClick={onCategories}
            className="hover:text-white"
          >
            Кат.
          </button>
        </div>
      </header>

      <div className="mt-8 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-white/35">
          Новый черновик
        </p>
        <h1 className="mt-2 font-serif text-[2rem] leading-tight tracking-tight">
          Что записать
          <br />
          сейчас?
        </h1>

        <div className="mt-8 grid gap-3">
          <ChannelTile
            title="Фото чека"
            hint="Только расход · vision"
            onClick={() => onStart("photo")}
            large
          />
          <div className="grid grid-cols-2 gap-3">
            <ChannelTile
              title="Голос"
              hint="Расход / доход"
              onClick={() => onStart("voice")}
            />
            <ChannelTile
              title="Вручную"
              hint="Тип на шаге"
              onClick={() => onStart("manual")}
            />
          </div>
        </div>
      </div>

      {last && (
        <button
          type="button"
          onClick={onHistory}
          className="mt-auto rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left"
        >
          <p className="text-[10px] uppercase tracking-widest text-white/35">
            Последняя запись
          </p>
          <p className="mt-1 flex justify-between text-sm">
            <span>
              {last.kind === "income"
                ? last.note || "Доход"
                : last.category || "Расход"}
            </span>
            <span className="tabular-nums text-[#E8B86D]">
              {last.kind === "income" ? "+" : "−"}
              {byn(last.amount)}
            </span>
          </p>
        </button>
      )}
    </div>
  );
}

function ChannelTile({
  title,
  hint,
  onClick,
  large,
}: {
  title: string;
  hint: string;
  onClick: () => void;
  large?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-3xl border border-[#E8B86D]/30 bg-gradient-to-br from-[#E8B86D]/15 to-transparent text-left transition active:scale-[0.98] ${
        large ? "px-5 py-7" : "px-4 py-5"
      }`}
    >
      <p className={`font-medium ${large ? "text-xl" : "text-base"}`}>{title}</p>
      <p className="mt-1 text-[11px] text-white/40">{hint}</p>
    </button>
  );
}

function ListScreen({
  title,
  onBack,
  items,
}: {
  title: string;
  onBack: () => void;
  items: HistoryItem[];
}) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-3">
      <button
        type="button"
        onClick={onBack}
        className="text-xs text-[#E8B86D]"
      >
        ← Захват
      </button>
      <h1 className="mt-3 font-serif text-3xl">{title}</h1>
      <ul className="mt-4 space-y-1">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-baseline justify-between border-b border-white/8 py-3"
          >
            <div>
              <p className="text-sm">
                {item.kind === "income"
                  ? item.note || "Доход"
                  : item.category}
              </p>
              <p className="text-[11px] text-white/35">
                {shortDate(item.occurredOn)} · {item.channel}
              </p>
            </div>
            <p
              className={`tabular-nums ${
                item.kind === "income" ? "text-[#E8B86D]" : "text-white/90"
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

function MonthFull({
  totals,
  onBack,
}: {
  totals: { expense: number; income: number; net: number };
  onBack: () => void;
}) {
  return (
    <div className="flex-1 px-4 pt-3">
      <button type="button" onClick={onBack} className="text-xs text-[#E8B86D]">
        ← Захват
      </button>
      <h1 className="mt-3 font-serif text-3xl">Август</h1>
      <div className="mt-10 space-y-8">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-white/35">
            Расходы
          </p>
          <p className="font-serif text-4xl tabular-nums">{byn(totals.expense)}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-white/35">
            Доходы
          </p>
          <p className="font-serif text-4xl tabular-nums text-[#E8B86D]">
            {byn(totals.income)}
          </p>
        </div>
        <div className="border-t border-white/15 pt-6">
          <p className="text-[11px] uppercase tracking-[0.2em] text-white/35">
            Нетто
          </p>
          <p className="font-serif text-5xl tabular-nums">
            {totals.net >= 0 ? "+" : ""}
            {byn(totals.net)}
          </p>
        </div>
      </div>
    </div>
  );
}

function Cats({ onBack }: { onBack: () => void }) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-3">
      <button type="button" onClick={onBack} className="text-xs text-[#E8B86D]">
        ← Захват
      </button>
      <h1 className="mt-3 font-serif text-3xl">Категории</h1>
      <ul className="mt-6">
        {CATEGORIES.map((c) => (
          <li
            key={c.id}
            className="flex justify-between border-b border-white/8 py-3 text-sm"
          >
            <span className={c.hidden ? "text-white/35 line-through" : ""}>
              {c.name}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-white/30">
              {c.seed ? "seed" : "custom"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PickType({
  onBack,
  onPick,
}: {
  onBack: () => void;
  onPick: (k: Kind) => void;
}) {
  return (
    <div className="flex flex-1 flex-col justify-center gap-4 px-6">
      <button
        type="button"
        onClick={onBack}
        className="absolute left-4 top-10 text-xs text-[#E8B86D]"
      >
        ←
      </button>
      <p className="text-center text-[11px] uppercase tracking-[0.25em] text-white/35">
        Вручную
      </p>
      <button
        type="button"
        onClick={() => onPick("expense")}
        className="rounded-3xl border border-white/15 py-8 text-xl font-medium"
      >
        Расход
      </button>
      <button
        type="button"
        onClick={() => onPick("income")}
        className="rounded-3xl border border-[#E8B86D]/50 bg-[#E8B86D]/10 py-8 text-xl font-medium text-[#E8B86D]"
      >
        Доход
      </button>
    </div>
  );
}

function ConfirmB({
  kind,
  channel,
  prefill,
  onDiscard,
  onSwitchKind,
  onCommit,
}: {
  kind: Kind;
  channel: "photo" | "voice" | "manual";
  prefill: Partial<HistoryItem>;
  onDiscard: () => void;
  onSwitchKind: (k: Kind) => void;
  onCommit: (d: {
    kind: Kind;
    amount: number;
    occurredOn: string;
    category?: string;
    note?: string;
    channel: "photo" | "voice" | "manual";
  }) => void;
}) {
  const [amount, setAmount] = useState(String(prefill.amount ?? ""));
  const [date, setDate] = useState(prefill.occurredOn ?? "2026-08-04");
  const [category, setCategory] = useState(prefill.category ?? "");
  const [note, setNote] = useState(prefill.note ?? "");

  const ok =
    Number(amount) > 0 && !!date && (kind === "income" || !!category);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pt-3">
      <div className="flex justify-between">
        <button type="button" onClick={onDiscard} className="text-xs text-white/40">
          Отменить
        </button>
        <span className="text-[10px] uppercase tracking-widest text-white/30">
          {channel}
        </span>
      </div>
      <h1 className="mt-4 font-serif text-3xl">Черновик</h1>

      {channel !== "photo" && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          {(["expense", "income"] as const).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => onSwitchKind(opt)}
              className={`rounded-xl py-2 text-xs font-semibold uppercase tracking-wider ${
                kind === opt
                  ? "bg-[#E8B86D] text-black"
                  : "bg-white/5 text-white/40"
              }`}
            >
              {opt === "expense" ? "Расход" : "Доход"}
            </button>
          ))}
        </div>
      )}

      <div className="mt-6 space-y-4">
        <Field label="Сумма">
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-transparent font-serif text-4xl tabular-nums outline-none placeholder:text-white/20"
            placeholder="0"
            inputMode="decimal"
          />
        </Field>
        <Field label="Дата">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-transparent text-sm outline-none"
          />
        </Field>
        {kind === "expense" && (
          <Field label="Категория">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-[#0B0C0F] text-sm outline-none"
            >
              <option value="">—</option>
              {CATEGORIES.filter((c) => !c.hidden).map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field label="Заметка">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full bg-transparent text-sm outline-none"
          />
        </Field>
      </div>

      <button
        type="button"
        disabled={!ok}
        onClick={() =>
          onCommit({
            kind,
            amount: Number(amount),
            occurredOn: date,
            category: kind === "expense" ? category : undefined,
            note: note || undefined,
            channel,
          })
        }
        className="mt-auto mb-4 w-full rounded-2xl bg-[#E8B86D] py-4 text-sm font-bold uppercase tracking-widest text-black disabled:opacity-30"
      >
        Сохранить
      </button>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block border-b border-white/10 pb-3">
      <span className="text-[10px] uppercase tracking-[0.2em] text-white/35">
        {label}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
