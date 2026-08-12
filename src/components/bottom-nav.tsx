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
      className="relative z-20 border-t border-white/85 bg-white/82 px-3 pb-[max(0.85rem,env(safe-area-inset-bottom))] pt-2.5 shadow-[0_-14px_44px_-28px_rgba(23,32,51,0.36)] backdrop-blur-xl"
      aria-label="Основная навигация"
      // Hide dock chrome under full-screen capture so confirm is uncluttered.
      hidden={isCaptureOpen}
    >
      <div className="mx-auto grid max-w-lg grid-cols-[1fr_auto_1fr] items-end gap-2">
        <NavTab href="/" active={onHome} label="Домой" icon={HOME_ICON} />

        <div
          className="-mt-10 flex items-center gap-1 rounded-[1.55rem] border border-white/90 bg-white/92 p-1.5 shadow-[0_20px_42px_-16px_rgba(23,32,51,0.34)] backdrop-blur-xl"
          role="group"
          aria-label="Добавить операцию"
        >
          <button
            type="button"
            onClick={openPhoto}
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-[1.05rem] bg-[#FFF0E9]/78 text-[#E66B43] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] transition hover:bg-[#FFE4D5] active:scale-95"
            aria-label="Фото чека"
          >
            {CAMERA_ICON}
          </button>
          <button
            type="button"
            onClick={openVoice}
            className="relative flex h-14 w-14 cursor-pointer items-center justify-center overflow-hidden rounded-[1.2rem] bg-gradient-to-br from-[#818CF8] via-[#4F46E5] to-[#312E81] text-white shadow-[0_14px_26px_-8px_rgba(79,70,229,0.68)] transition hover:brightness-105 active:scale-95"
            aria-label="Голосовая запись"
          >
            {MIC_ICON}
          </button>
          <button
            type="button"
            onClick={openManual}
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-[1.05rem] bg-[#EEF2FF]/82 text-[#4F46E5] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] transition hover:bg-[#E0E7FF] active:scale-95"
            aria-label="Вручную"
          >
            {PEN_ICON}
          </button>
        </div>

        <NavTab href="/month" active={onMonth} label="Месяц" icon={CHART_ICON} />
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
      className={`flex flex-col items-center gap-1 rounded-2xl py-1.5 text-[10px] font-semibold transition-[color,transform] duration-300 ease-out active:scale-[0.98] ${
        active
          ? "text-[#4F46E5]"
          : "text-[#697386] hover:text-[#172033]"
      }`}
      aria-current={active ? "page" : undefined}
    >
      <span
        className={`nav-tab-icon flex h-8 w-8 items-center justify-center rounded-xl transition-[background-color,box-shadow,transform] duration-300 ease-out ${
          active
            ? "nav-tab-icon-active bg-gradient-to-br from-[#EEF2FF] to-[#E0E7FF] shadow-[0_8px_16px_-12px_rgba(79,70,229,0.52)]"
            : ""
        }`}
      >
        {icon}
      </span>
      <span className={`nav-tab-label ${active ? "nav-tab-label-active" : ""}`}>
        {label}
      </span>
      <span
        aria-hidden
        className={`nav-tab-indicator ${active ? "nav-tab-indicator-active" : ""}`}
      />
    </Link>
  );
}
