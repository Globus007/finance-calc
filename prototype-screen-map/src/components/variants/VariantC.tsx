"use client";

/**
 * Variant C — Voice stage + feed
 * Same soft-purple fintech system as A, different IA:
 * one continuous surface. Huge mic is the hero of the home stage.
 * Month totals sit in a stats card (donut + bars). Secondary channels
 * as small pills under the mic. No bottom tabs — mic floats.
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
  IconMic,
  IconPen,
  IconTags,
} from "../icons";

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
    setOverlay(null);
  };

  const share =
    totals.income + totals.expense > 0
      ? Math.round((totals.income / (totals.income + totals.expense)) * 100)
      : 50;

  return (
    <PhoneFrame chrome="C · Voice stage + feed">
      <div className="relative flex h-full flex-col bg-[#F3F0FA] text-[#1A1B2E]">
        <div className="pointer-events-none absolute -left-12 top-20 h-48 w-48 rounded-full bg-[#C4B5FD]/40 blur-3xl" />
        <div className="pointer-events-none absolute -right-10 bottom-40 h-40 w-40 rounded-full bg-[#93C5FD]/30 blur-3xl" />

        <div className="relative min-h-0 flex-1 overflow-y-auto px-4 pb-28 pt-2">
          {/* header */}
          <header className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[#1A1B2E]/45">Запись</p>
              <h1 className="text-xl font-bold tracking-tight">Скажи сумму</h1>
            </div>
            <button
              type="button"
              onClick={() => setOverlay({ type: "categories" })}
              className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-white text-[#5B6CFF] shadow-sm transition active:scale-95"
              aria-label="Категории"
            >
              <IconTags size={18} />
            </button>
          </header>

          {/* HERO mic */}
          <div className="mt-6 flex flex-col items-center">
            <button
              type="button"
              onClick={() => start("voice")}
              className="group relative cursor-pointer transition active:scale-95"
              aria-label="Голосовая запись"
            >
              <span className="absolute -inset-3 rounded-full bg-[#5B6CFF]/15 blur-md transition group-hover:bg-[#5B6CFF]/25" />
              <span className="absolute -inset-1 animate-pulse rounded-full bg-[#5B6CFF]/10" />
              <span className="relative flex h-36 w-36 items-center justify-center rounded-full bg-gradient-to-br from-[#6D7CFF] via-[#5B6CFF] to-[#4338CA] text-white shadow-[0_20px_50px_-12px_rgba(91,108,255,0.7)]">
                <IconMic size={56} />
              </span>
            </button>
            <p className="mt-4 text-sm font-bold text-[#5B6CFF]">Удержи или тап</p>
            <p className="mt-0.5 text-center text-[11px] text-[#1A1B2E]/40">
              «Кофе 12.50» · «Зарплата 2100»
            </p>

            {/* secondary channels */}
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => start("photo")}
                className="flex cursor-pointer items-center gap-2 rounded-full bg-white px-4 py-2.5 text-xs font-semibold shadow-sm transition active:scale-95"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#FF8A4C] text-white">
                  <IconCamera size={14} />
                </span>
                Фото
              </button>
              <button
                type="button"
                onClick={() => start("manual")}
                className="flex cursor-pointer items-center gap-2 rounded-full bg-white px-4 py-2.5 text-xs font-semibold shadow-sm transition active:scale-95"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#A78BFA] text-white">
                  <IconPen size={14} />
                </span>
                Вручную
              </button>
            </div>
          </div>

          {/* month stats card — like Pinterest statistics */}
          <div className="mt-8 rounded-[1.75rem] bg-white p-4 shadow-[0_10px_40px_-12px_rgba(91,108,255,0.15)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[#1A1B2E]/45">Август · live</p>
                <p className="mt-0.5 text-2xl font-bold tabular-nums">
                  {totals.net >= 0 ? "+" : ""}
                  {byn(totals.net)}
                </p>
              </div>
              {/* donut */}
              <div
                className="relative h-16 w-16 shrink-0 rounded-full"
                style={{
                  background: `conic-gradient(#5B6CFF 0% ${share}%, #FF8A4C ${share}% 100%)`,
                }}
              >
                <div className="absolute inset-2 flex items-center justify-center rounded-full bg-white">
                  <span className="text-[9px] font-bold leading-tight text-[#1A1B2E]/50">
                    {share}%
                    <br />
                    in
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-[#EEF2FF] px-3 py-2">
                <p className="text-[10px] font-medium text-[#5B6CFF]">Доход</p>
                <p className="text-sm font-bold tabular-nums">
                  {byn(totals.income)}
                </p>
              </div>
              <div className="rounded-xl bg-[#FFF7ED] px-3 py-2">
                <p className="text-[10px] font-medium text-[#F97316]">Расход</p>
                <p className="text-sm font-bold tabular-nums">
                  {byn(totals.expense)}
                </p>
              </div>
            </div>
          </div>

          {/* history feed */}
          <div className="mt-6 flex items-center justify-between">
            <h2 className="text-base font-bold">История</h2>
            <span className="text-[11px] font-medium text-[#1A1B2E]/35">
              {items.length}
            </span>
          </div>
          <ul className="mt-3 space-y-2">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex items-center gap-3 rounded-2xl bg-white px-3 py-3 shadow-[0_4px_16px_-8px_rgba(26,27,46,0.12)]"
              >
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                    item.kind === "income"
                      ? "bg-[#D1FAE5] text-[#059669]"
                      : "bg-[#FFEDD5] text-[#EA580C]"
                  }`}
                >
                  {item.kind === "income" ? (
                    <IconArrowDownLeft size={18} />
                  ) : (
                    <IconArrowUpRight size={18} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {item.kind === "income"
                      ? item.note || "Доход"
                      : item.category}
                  </p>
                  <p className="text-[11px] text-[#1A1B2E]/40">
                    {shortDate(item.occurredOn)}
                    {item.note && item.kind === "expense"
                      ? ` · ${item.note}`
                      : ""}{" "}
                    · {item.channel}
                  </p>
                </div>
                <p
                  className={`shrink-0 text-sm font-bold tabular-nums ${
                    item.kind === "income" ? "text-[#059669]" : ""
                  }`}
                >
                  {item.kind === "income" ? "+" : "−"}
                  {byn(item.amount)}
                </p>
              </li>
            ))}
          </ul>
        </div>

        {/* floating mic dock (always, when no overlay) */}
        {!overlay && (
          <div className="absolute bottom-8 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/80 bg-white/95 p-1.5 shadow-[0_12px_40px_-8px_rgba(26,27,46,0.25)] backdrop-blur">
            <button
              type="button"
              onClick={() => start("photo")}
              className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-[#FF8A4C] transition hover:bg-[#FFF7ED] active:scale-95"
              aria-label="Фото"
            >
              <IconCamera size={20} />
            </button>
            <button
              type="button"
              onClick={() => start("voice")}
              className="flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-gradient-to-br from-[#5B6CFF] to-[#4338CA] text-white shadow-lg shadow-[#5B6CFF]/40 transition active:scale-95"
              aria-label="Голос"
            >
              <IconMic size={26} />
            </button>
            <button
              type="button"
              onClick={() => start("manual")}
              className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-[#A78BFA] transition hover:bg-[#F5F3FF] active:scale-95"
              aria-label="Вручную"
            >
              <IconPen size={20} />
            </button>
          </div>
        )}

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
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-gradient-to-b from-[#5B6CFF] to-[#312E81] text-white">
            <div className="relative flex h-28 w-28 items-center justify-center">
              <span className="absolute inset-0 animate-ping rounded-full bg-white/20" />
              <span className="relative flex h-24 w-24 items-center justify-center rounded-full bg-white/15 ring-4 ring-white/30">
                {overlay.channel === "voice" ? (
                  <IconMic size={40} />
                ) : (
                  <IconCamera size={40} />
                )}
              </span>
            </div>
            <p className="text-base font-semibold">
              {overlay.channel === "photo" ? "Читаем чек…" : "Слушаем…"}
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

        <div className="border-t border-dashed border-[#5B6CFF]/25 bg-[#1A1B2E] px-3 py-1.5 font-mono text-[10px] text-[#A5B4FC]">
          state · overlay={overlay?.type ?? "none"} · n={items.length}
        </div>
      </div>
    </PhoneFrame>
  );
}

function SidePanel({ onClose }: { onClose: () => void }) {
  return (
    <div className="absolute inset-0 z-30 flex justify-end bg-[#1A1B2E]/40">
      <button
        type="button"
        className="flex-1 cursor-pointer"
        onClick={onClose}
        aria-label="Close"
      />
      <div className="h-full w-[80%] overflow-y-auto bg-[#F3F0FA] px-4 pt-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold">Категории</h2>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer text-sm text-[#5B6CFF]"
          >
            Закрыть
          </button>
        </div>
        <ul className="mt-4 space-y-2">
          {CATEGORIES.map((c) => (
            <li
              key={c.id}
              className="flex justify-between rounded-2xl bg-white px-3 py-3 text-sm shadow-sm"
            >
              <span className={c.hidden ? "opacity-40 line-through" : "font-medium"}>
                {c.name}
              </span>
              <span className="text-[10px] uppercase tracking-wider text-[#1A1B2E]/35">
                {c.seed ? "seed" : "custom"}
                {c.hidden ? " · H" : ""}
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
    <div className="absolute inset-0 z-30 flex items-end justify-center bg-[#1A1B2E]/40 p-4">
      <div className="w-full rounded-[1.75rem] bg-white p-5 shadow-2xl">
        <p className="text-xs font-medium text-[#1A1B2E]/40">Вручную</p>
        <p className="mt-1 text-lg font-bold">Что записываем?</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onExpense}
            className="cursor-pointer rounded-2xl bg-[#1A1B2E] py-5 text-sm font-bold text-white transition active:scale-95"
          >
            Расход
          </button>
          <button
            type="button"
            onClick={onIncome}
            className="cursor-pointer rounded-2xl bg-gradient-to-br from-[#5B6CFF] to-[#4338CA] py-5 text-sm font-bold text-white transition active:scale-95"
          >
            Доход
          </button>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-3 w-full cursor-pointer py-2 text-xs text-[#1A1B2E]/40"
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
    <div className="absolute inset-0 z-30 flex flex-col justify-end bg-[#1A1B2E]/45">
      <div className="max-h-[88%] overflow-y-auto rounded-t-[1.75rem] bg-[#F3F0FA] px-4 pb-6 pt-3">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[#1A1B2E]/12" />
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onDiscard}
            className="flex cursor-pointer items-center gap-1 text-xs font-semibold text-[#1A1B2E]/45"
          >
            <IconArrowLeft size={14} /> Отмена
          </button>
          <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#5B6CFF]">
            {channel}
          </span>
        </div>
        <h2 className="mt-3 text-xl font-bold">Черновик</h2>

        {channel !== "photo" && (
          <div className="mt-3 flex gap-2">
            {(["expense", "income"] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setKind(opt)}
                className={`flex-1 cursor-pointer rounded-xl py-2.5 text-xs font-bold transition ${
                  kind === opt
                    ? "bg-[#5B6CFF] text-white shadow-md shadow-[#5B6CFF]/30"
                    : "bg-white text-[#1A1B2E]/40"
                }`}
              >
                {opt === "expense" ? "Расход" : "Доход"}
              </button>
            ))}
          </div>
        )}

        <label className="mt-4 block text-[10px] font-bold uppercase tracking-wider text-[#1A1B2E]/40">
          Сумма
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
            className="mt-1.5 w-full rounded-2xl border-0 bg-white px-4 py-3.5 text-2xl font-bold tabular-nums outline-none ring-1 ring-[#1A1B2E]/8 focus:ring-2 focus:ring-[#5B6CFF]"
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
        {kind === "expense" && (
          <label className="mt-3 block text-[10px] font-bold uppercase tracking-wider text-[#1A1B2E]/40">
            Категория
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1.5 w-full rounded-2xl border-0 bg-white px-4 py-3 text-sm outline-none ring-1 ring-[#1A1B2E]/8 focus:ring-2 focus:ring-[#5B6CFF]"
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
        <label className="mt-3 block text-[10px] font-bold uppercase tracking-wider text-[#1A1B2E]/40">
          Заметка
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="mt-1.5 w-full rounded-2xl border-0 bg-white px-4 py-3 text-sm outline-none ring-1 ring-[#1A1B2E]/8 focus:ring-2 focus:ring-[#5B6CFF]"
          />
        </label>

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
          className="mt-6 w-full cursor-pointer rounded-2xl bg-gradient-to-r from-[#5B6CFF] to-[#4F46E5] py-4 text-sm font-bold text-white shadow-lg shadow-[#5B6CFF]/35 disabled:opacity-30"
        >
          Сохранить
        </button>
      </div>
    </div>
  );
}
