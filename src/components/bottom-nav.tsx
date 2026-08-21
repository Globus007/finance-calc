"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCapture } from "@/components/capture/capture-flow";
import {
  IconNavAnalytics,
  IconNavCamera,
  IconNavCompose,
  IconNavHome,
  IconNavMic,
} from "./icons";

/** Hoisted static icons — avoid re-creating element trees each render. */
const HOME_ICON = <IconNavHome size={20} />;
const CHART_ICON = <IconNavAnalytics size={20} />;
const CAMERA_ICON = <IconNavCamera size={21} />;
const MIC_ICON = <IconNavMic size={25} />;
const PEN_ICON = <IconNavCompose size={21} />;

/**
 * Home chrome bottom bar: Домой | photo · big mic · manual | Месяц.
 * Voice is the primary dock affordance (issue #28).
 */
export function BottomNav() {
  const pathname = usePathname();
  const { openManual, openPhoto, openVoice, isCaptureOpen } = useCapture();
  const onHome = pathname === "/";
  const onMonth = pathname === "/month" || pathname.startsWith("/month/");

  return (
    <nav
      className="relative z-20 bg-transparent px-3 pb-[max(0.85rem,env(safe-area-inset-bottom))] pt-1"
      aria-label="Основная навигация"
      // Hide dock chrome under full-screen capture so confirm is uncluttered.
      hidden={isCaptureOpen}
    >
      <div className="mx-auto flex w-full min-w-0 max-w-lg items-end gap-1">
        <div className="flex min-w-0 flex-1 justify-center">
          <NavTab href="/" active={onHome} label="Домой" icon={HOME_ICON} />
        </div>

        <div
          className="-mt-7 flex shrink-0 items-center gap-1 rounded-full bg-white p-1.5 shadow-dock"
          role="group"
          aria-label="Добавить операцию"
        >
          <button
            type="button"
            onClick={openPhoto}
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-[#f4f1f8] text-ink transition hover:bg-[#ece8f3] active:scale-95"
            aria-label="Фото чека"
          >
            {CAMERA_ICON}
          </button>
          <button
            type="button"
            onClick={openVoice}
            className="relative flex h-14 w-14 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-ink text-white shadow-[0_12px_22px_-10px_rgba(26,26,34,0.7)] transition hover:brightness-110 active:scale-95"
            aria-label="Голосовая запись"
          >
            {MIC_ICON}
          </button>
          <button
            type="button"
            onClick={openManual}
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-[#f4f1f8] text-ink transition hover:bg-[#ece8f3] active:scale-95"
            aria-label="Вручную"
          >
            {PEN_ICON}
          </button>
        </div>

        <div className="flex min-w-0 flex-1 justify-center">
          <NavTab href="/month" active={onMonth} label="Месяц" icon={CHART_ICON} />
        </div>
      </div>
    </nav>
  );
}

function NavTab({
  href,
  active,
  label,
  icon,
}: {
  href: string;
  active: boolean;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`flex min-w-0 flex-col items-center gap-0.5 rounded-2xl py-1.5 text-[10px] font-semibold transition-[color,transform] duration-300 ease-out active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100 ${
        active ? "text-ink" : "text-ink-muted hover:text-ink"
      }`}
      aria-current={active ? "page" : undefined}
    >
      <span
        className={`nav-tab-icon flex h-9 w-9 items-center justify-center rounded-[0.9rem] transition-[background-color,color,transform] duration-300 ease-out ${
          active
            ? "nav-tab-icon-active bg-[#2a2348] text-white"
            : "text-ink"
        }`}
      >
        {icon}
      </span>
      <span className={`nav-tab-label ${active ? "nav-tab-label-active" : ""}`}>
        {label}
      </span>
    </Link>
  );
}
