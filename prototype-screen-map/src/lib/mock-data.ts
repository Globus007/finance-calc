/** PROTOTYPE mock — in-memory only (issue #8) */

export type Kind = "expense" | "income";

export type HistoryItem = {
  id: string;
  kind: Kind;
  amount: number;
  occurredOn: string;
  category?: string;
  note?: string;
  channel: "photo" | "voice" | "manual";
};

export type Category = {
  id: string;
  name: string;
  seed: boolean;
  hidden: boolean;
};

export const CATEGORIES: Category[] = [
  { id: "c1", name: "Продукты", seed: true, hidden: false },
  { id: "c2", name: "Кафе", seed: true, hidden: false },
  { id: "c3", name: "Транспорт", seed: true, hidden: false },
  { id: "c4", name: "Жильё", seed: true, hidden: false },
  { id: "c5", name: "Здоровье", seed: true, hidden: false },
  { id: "c6", name: "Прочее", seed: true, hidden: false },
  { id: "c7", name: "Подписки", seed: false, hidden: false },
  { id: "c8", name: "Хобби", seed: false, hidden: true },
];

export const HISTORY: HistoryItem[] = [
  {
    id: "1",
    kind: "expense",
    amount: 48.2,
    occurredOn: "2026-08-04",
    category: "Продукты",
    note: "Евроопт",
    channel: "photo",
  },
  {
    id: "2",
    kind: "income",
    amount: 2100,
    occurredOn: "2026-08-01",
    note: "Зарплата",
    channel: "manual",
  },
  {
    id: "3",
    kind: "expense",
    amount: 12.5,
    occurredOn: "2026-08-03",
    category: "Кафе",
    note: "Кофе",
    channel: "voice",
  },
  {
    id: "4",
    kind: "expense",
    amount: 6.4,
    occurredOn: "2026-08-02",
    category: "Транспорт",
    channel: "manual",
  },
  {
    id: "5",
    kind: "income",
    amount: 40,
    occurredOn: "2026-07-28",
    note: "Кэшбэк",
    channel: "voice",
  },
  {
    id: "6",
    kind: "expense",
    amount: 89.9,
    occurredOn: "2026-07-30",
    category: "Подписки",
    note: "Год VPN",
    channel: "manual",
  },
];

export function monthTotals(items: HistoryItem[], ym = "2026-08") {
  const inMonth = items.filter((i) => i.occurredOn.startsWith(ym));
  const expense = inMonth
    .filter((i) => i.kind === "expense")
    .reduce((s, i) => s + i.amount, 0);
  const income = inMonth
    .filter((i) => i.kind === "income")
    .reduce((s, i) => s + i.amount, 0);
  return { expense, income, net: income - expense, ym };
}

export function byn(n: number) {
  return (
    n.toLocaleString("ru-BY", {
      minimumFractionDigits: n % 1 ? 2 : 0,
      maximumFractionDigits: 2,
    }) + " BYN"
  );
}

export function shortDate(iso: string) {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("ru-BY", { day: "numeric", month: "short" });
}
