"use client";

/**
 * Variant C — Ledger feed
 * One continuous surface: sticky month strip + mixed history.
 * Capture is always present as a three-button dock (photo | voice | pen).
 * Categories open as a side panel from the month strip — no separate tab IA.
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

type Overlay =
  | null
  | { type: "categories" }
  | { type: "manual-type" }
  | { type: "capturing"; channel: "photo" | "voice" }
  | {
      type: "confirm";
      kind: Kind;
      channel: "photo" | "voice" | "manual";
      prefill?: Partial<HistoryItem>;
    };

export function VariantC() {
  const [items, setItems] = useState(HISTORY);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [monthOpen, setMonthOpen] = useState(true);
  const totals = useMemo(() => monthTotals(items), [items]);

  const start = (channel: "photo" | "voice" | "manual") => {
    if (channel === "manual") {
      setOverlay({ type: "manual-type" });
      return;
    }
    setOverlay({ type: "capturing", channel });
    window.setTimeout(() => {
      setOverlay({
        type: "confirm",
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
    setItems((prev) => [{ id: String(Date.now()), ...draft }, ...prev]);
    setOverlay(null);
  };

  return (
    <PhoneFrame chrome="C · Лента + шапка месяца">
      <div className="relative flex h-full flex-col bg-[#FFFDF8] text-[#1A1510]">
        {/* thermal edge */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-1.5 bg-[repeating-linear-gradient(180deg,#FF6B4A_0_8px,transparent_8px_12px)]" />

        {/* sticky month */}
        <button
          type="button"
          onClick={() => setMonthOpen((v) => !v)}
          className="sticky top-0 z-10 border-b border-[#1A1510]/10 bg-[#FFFDF8]/95 px-4 py-3 pl-5 backdrop-blur"
        >
          <div className="flex items-end justify-between">
            <div className="text-left">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#FF6B4A]">
                Авг · live
              </p>
              <p className="font-mono text-2xl font-semibold tabular-nums leading-none">
                {totals.net >= 0 ? "+" : ""}
                {byn(totals.net)}
              </p>
            </div>
            <span className="font-mono text-[10px] text-[#1A1510]/40">
              {monthOpen ? "свернуть ▴" : "развернуть ▾"}
            </span>
          </div>
          {monthOpen && (
            <div className="mt-3 grid grid-cols-2 gap-2 text-left">
              <div className="rounded-lg bg-[#1A1510]/[0.04] px-2 py-2">
                <p className="font-mono text-[9px] uppercase text-[#1A1510]/40">
                  Расход
                </p>
                <p className="font-mono text-sm tabular-nums">
                  {byn(totals.expense)}
                </p>
              </div>
              <div className="rounded-lg bg-[#FF6B4A]/10 px-2 py-2">
                <p className="font-mono text-[9px] uppercase text-[#FF6B4A]">
                  Доход
                </p>
                <p className="font-mono text-sm tabular-nums">
                  {byn(totals.income)}
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setOverlay({ type: "categories" });
                }}
                className="col-span-2 rounded-lg border border-dashed border-[#1A1510]/15 py-2 font-mono text-[10px] uppercase tracking-wider text-[#1A1510]/50"
              >
                Категории →
              </button>
            </div>
          )}
        </button>

        {/* feed */}
        <div className="min-h-0 flex-1 overflow-y-auto pl-5 pr-3">
          <p className="sticky top-0 bg-[#FFFDF8] py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[#1A1510]/35">
            История · expense + income
          </p>
          <ul>
            {items.map((item, i) => (
              <li
                key={item.id}
                className="grid grid-cols-[auto_1fr_auto] items-baseline gap-2 border-b border-[#1A1510]/[0.06] py-2.5"
              >
                <span className="w-10 font-mono text-[10px] text-[#1A1510]/35">
                  {shortDate(item.occurredOn)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {item.kind === "income"
                      ? `↓ ${item.note || "Доход"}`
                      : item.category}
                  </p>
                  {item.kind === "expense" && item.note ? (
                    <p className="truncate font-mono text-[10px] text-[#1A1510]/40">
                      {item.note} · {item.channel}
                    </p>
                  ) : (
                    <p className="font-mono text-[10px] text-[#1A1510]/40">
                      {item.channel}
                    </p>
                  )}
                </div>
                <span
                  className={`font-mono text-sm tabular-nums ${
                    item.kind === "income" ? "text-[#FF6B4A]" : ""
                  }`}
                >
                  {item.kind === "income" ? "+" : "−"}
                  {item.amount.toFixed(item.amount % 1 ? 2 : 0)}
                </span>
                {i === 0 && (
                  <span className="col-span-3 font-mono text-[9px] text-[#1A1510]/25">
                    # row {i + 1}
                  </span>
                )}
              </li>
            ))}
          </ul>
          <div className="h-24" />
        </div>

        {/* always-on capture dock */}
        <div className="absolute bottom-8 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-full border border-[#1A1510]/10 bg-[#1A1510] p-1.5 shadow-xl">
          <DockBtn label="Фото" onClick={() => start("photo")} />
          <DockBtn label="Голос" onClick={() => start("voice")} primary />
          <DockBtn label="Вручн." onClick={() => start("manual")} />
        </div>

        {/* overlays */}
        {overlay?.type === "categories" && (
          <SidePanel onClose={() => setOverlay(null)} />
        )}
        {overlay?.type === "manual-type" && (
          <CenterCard
            onClose={() => setOverlay(null)}
            onExpense={() =>
              setOverlay({
                type: "confirm",
                kind: "expense",
                channel: "manual",
                prefill: { occurredOn: "2026-08-04" },
              })
            }
            onIncome={() =>
              setOverlay({
                type: "confirm",
                kind: "income",
                channel: "manual",
                prefill: { occurredOn: "2026-08-04" },
              })
            }
          />
        )}
        {overlay?.type === "capturing" && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#1A1510]/80">
            <p className="font-mono text-sm text-[#FF6B4A]">
              extract · {overlay.channel}…
            </p>
          </div>
        )}
        {overlay?.type === "confirm" && (
          <ConfirmSheet
            kind={overlay.kind}
            channel={overlay.channel}
            prefill={overlay.prefill}
            onDiscard={() => setOverlay(null)}
            onCommit={commit}
          />
        )}

        <div className="border-t border-[#1A1510]/10 bg-[#1A1510] px-3 py-1.5 font-mono text-[10px] text-[#FF6B4A]">
          state · overlay={overlay?.type ?? "none"} · monthOpen={String(monthOpen)} ·
          n={items.length}
        </div>
      </div>
    </PhoneFrame>
  );
}

function DockBtn({
  label,
  onClick,
  primary,
}: {
  label: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-wide ${
        primary
          ? "bg-[#FF6B4A] text-white"
          : "bg-transparent text-white/70 hover:text-white"
      }`}
    >
      {label}
    </button>
  );
}

function SidePanel({ onClose }: { onClose: () => void }) {
  return (
    <div className="absolute inset-0 z-30 flex justify-end bg-[#1A1510]/40">
      <button type="button" className="flex-1" onClick={onClose} aria-label="Close" />
      <div className="h-full w-[78%] overflow-y-auto bg-[#FFFDF8] pl-4 pr-3 pt-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="font-mono text-sm font-bold uppercase tracking-wider">
            Категории
          </h2>
          <button type="button" onClick={onClose} className="text-xs">
            ✕
          </button>
        </div>
        <ul className="mt-4 space-y-1">
          {CATEGORIES.map((c) => (
            <li
              key={c.id}
              className="flex justify-between border-b border-[#1A1510]/8 py-2 font-mono text-xs"
            >
              <span className={c.hidden ? "opacity-40 line-through" : ""}>
                {c.name}
              </span>
              <span className="text-[#1A1510]/35">
                {c.seed ? "S" : "U"}
                {c.hidden ? "·H" : ""}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function CenterCard({
  onClose,
  onExpense,
  onIncome,
}: {
  onClose: () => void;
  onExpense: () => void;
  onIncome: () => void;
}) {
  return (
    <div className="absolute inset-0 z-30 flex items-end justify-center bg-[#1A1510]/45 p-4">
      <div className="w-full rounded-2xl bg-[#FFFDF8] p-4 shadow-2xl">
        <p className="font-mono text-[10px] uppercase tracking-widest text-[#1A1510]/40">
          Вручную
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onExpense}
            className="rounded-xl bg-[#1A1510] py-4 font-mono text-xs font-bold uppercase text-white"
          >
            Расход
          </button>
          <button
            type="button"
            onClick={onIncome}
            className="rounded-xl bg-[#FF6B4A] py-4 font-mono text-xs font-bold uppercase text-white"
          >
            Доход
          </button>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-3 w-full py-2 font-mono text-[10px] text-[#1A1510]/40"
        >
          Отмена
        </button>
      </div>
    </div>
  );
}

function ConfirmSheet({
  kind: initialKind,
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
  const [kind, setKind] = useState(initialKind);
  const [amount, setAmount] = useState(String(prefill?.amount ?? ""));
  const [date, setDate] = useState(prefill?.occurredOn ?? "2026-08-04");
  const [category, setCategory] = useState(prefill?.category ?? "");
  const [note, setNote] = useState(prefill?.note ?? "");
  const ok =
    Number(amount) > 0 && !!date && (kind === "income" || !!category);

  return (
    <div className="absolute inset-0 z-30 flex flex-col justify-end bg-[#1A1510]/50">
      <div className="max-h-[85%] overflow-y-auto rounded-t-3xl bg-[#FFFDF8] px-4 pb-6 pt-4">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[#1A1510]/15" />
        <div className="flex items-center justify-between">
          <h2 className="font-mono text-sm font-bold uppercase tracking-wider">
            Confirm draft
          </h2>
          <span className="font-mono text-[10px] text-[#1A1510]/35">
            {channel}
          </span>
        </div>

        {channel === "voice" && (
          <div className="mt-3 flex gap-2">
            {(["expense", "income"] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setKind(opt)}
                className={`flex-1 rounded-lg py-2 font-mono text-[10px] font-bold uppercase ${
                  kind === opt
                    ? "bg-[#1A1510] text-white"
                    : "bg-[#1A1510]/5 text-[#1A1510]/40"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        )}

        <label className="mt-4 block font-mono text-[10px] uppercase text-[#1A1510]/40">
          Amount
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
            className="mt-1 w-full border-b-2 border-[#1A1510] bg-transparent py-2 font-mono text-2xl tabular-nums outline-none"
          />
        </label>
        <label className="mt-3 block font-mono text-[10px] uppercase text-[#1A1510]/40">
          Occurred on
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 w-full border-b border-[#1A1510]/20 bg-transparent py-2 font-mono text-sm outline-none"
          />
        </label>
        {kind === "expense" && (
          <label className="mt-3 block font-mono text-[10px] uppercase text-[#1A1510]/40">
            Category
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 w-full border-b border-[#1A1510]/20 bg-transparent py-2 font-mono text-sm outline-none"
            >
              <option value="">—</option>
              {CATEGORIES.filter((c) => !c.hidden).map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="mt-3 block font-mono text-[10px] uppercase text-[#1A1510]/40">
          Note
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="mt-1 w-full border-b border-[#1A1510]/20 bg-transparent py-2 font-mono text-sm outline-none"
          />
        </label>

        <div className="mt-6 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onDiscard}
            className="rounded-xl border border-[#1A1510]/15 py-3 font-mono text-xs uppercase"
          >
            Discard
          </button>
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
            className="rounded-xl bg-[#FF6B4A] py-3 font-mono text-xs font-bold uppercase text-white disabled:opacity-30"
          >
            Commit
          </button>
        </div>
      </div>
    </div>
  );
}
