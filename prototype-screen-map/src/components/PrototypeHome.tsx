"use client";

import { useSearchParams } from "next/navigation";
import {
  PrototypeSwitcher,
  type VariantMeta,
} from "./PrototypeSwitcher";
import { VariantA } from "./variants/VariantA";
import { VariantB } from "./variants/VariantB";
import { VariantC } from "./variants/VariantC";

const VARIANTS: VariantMeta[] = [
  { key: "A", name: "Вкладки + FAB" },
  { key: "B", name: "Захват — дом" },
  { key: "C", name: "Лента + месяц" },
];

export function PrototypeHome() {
  const searchParams = useSearchParams();
  const raw = searchParams.get("variant")?.toUpperCase() ?? "A";
  const current = VARIANTS.some((v) => v.key === raw) ? raw : "A";

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,#27272a_0%,#09090b_55%)] pb-28 text-zinc-100">
      <div className="mx-auto max-w-5xl px-4 pt-8">
        <header className="mb-8 max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-amber-400/90">
            PROTOTYPE · issue #8 · throwaway
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">
            MVP screen map &amp; primary mobile flows
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            Вопрос: какая минимальная карта экранов и основные потоки —
            capture → confirm → history → monthly total → categories → income?
            Три радикально разные IA. Стрелки внизу или ← → на клавиатуре.
            Внизу телефона — live state strip.
          </p>
          <ul className="mt-4 space-y-1 text-xs text-zinc-500">
            <li>
              <span className="text-amber-300/90">A</span> — вкладки История /
              Месяц + центральный FAB, категории из шапки
            </li>
            <li>
              <span className="text-amber-300/90">B</span> — дом = только захват;
              история / месяц / категории вторичны
            </li>
            <li>
              <span className="text-amber-300/90">C</span> — одна лента + sticky
              итог месяца; capture dock всегда внизу
            </li>
          </ul>
        </header>

        <div className="flex justify-center">
          {current === "A" && <VariantA />}
          {current === "B" && <VariantB />}
          {current === "C" && <VariantC />}
        </div>
      </div>

      <PrototypeSwitcher variants={VARIANTS} current={current} />
    </div>
  );
}
