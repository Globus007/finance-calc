"use client";

import { useSearchParams } from "next/navigation";
import {
  PrototypeSwitcher,
  type VariantMeta,
} from "./PrototypeSwitcher";
import { VariantA } from "./variants/VariantA";
import { VariantC } from "./variants/VariantC";

const VARIANTS: VariantMeta[] = [
  { key: "A", name: "Dashboard + mic" },
  { key: "C", name: "Voice stage" },
];

export function PrototypeHome() {
  const searchParams = useSearchParams();
  const raw = searchParams.get("variant")?.toUpperCase() ?? "A";
  const current = VARIANTS.some((v) => v.key === raw) ? raw : "A";

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,#C4B5FD_0%,#A5B4FC_25%,#EDE9FE_55%,#F5F3FF_100%)] pb-28 text-[#1A1B2E]">
      <div className="mx-auto max-w-5xl px-4 pt-8">
        <header className="mb-8 max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#5B6CFF]">
            PROTOTYPE · issue #8 · throwaway
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">
            MVP screen map · soft fintech + voice-first
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-[#1A1B2E]/60">
            Визуальный язык как на{" "}
            <a
              href="https://www.pinterest.com/pin/1094163672026400110/"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-[#5B6CFF] underline-offset-2 hover:underline"
            >
              Pinterest-референсе
            </a>
            : lavender фон, белые карточки, синий primary, цветные action chips.
            Голос — основной канал (большой микрофон). Вкладка B снята.
            Стрелки внизу или ← →.
          </p>
          <ul className="mt-4 space-y-1 text-xs text-[#1A1B2E]/50">
            <li>
              <span className="font-semibold text-[#5B6CFF]">A</span> — dashboard
              · tab Домой |{" "}
              <strong>dock фото·mic·ручн. (из C)</strong> | Месяц
            </li>
            <li>
              <span className="font-semibold text-[#5B6CFF]">C</span> — hero-mic
              stage + month card + feed · floating dock · без вкладок
            </li>
          </ul>
        </header>

        <div className="flex justify-center">
          {current === "A" && <VariantA />}
          {current === "C" && <VariantC />}
        </div>
      </div>

      <PrototypeSwitcher variants={VARIANTS} current={current} />
    </div>
  );
}
