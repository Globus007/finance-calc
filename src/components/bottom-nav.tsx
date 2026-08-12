"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCapture } from "@/components/capture/capture-flow";
import { IconCamera, IconChart, IconHome, IconMic, IconPen } from "./icons";

/** Hoisted static icons — avoid re-creating element trees each render. */
const HOME_ICON = <IconHome size={20} />;
const CHART_ICON = <IconChart size={20} />;
const CAMERA_ICON = <IconCamera size={20} />;
const MIC_ICON = <IconMic size={26} />;
const PEN_ICON = <IconPen size={20} />;

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
      className="relative z-20 border-t border-white/80 bg-white/78 px-3 pb-[max(0.85rem,env(safe-area-inset-bottom))] pt-2.5 shadow-[0_-12px_40px_-28px_rgba(23,32,51,0.34)] backdrop-blur-xl"
      aria-label="Основная навигация"
      // Hide dock chrome under full-screen capture so confirm is uncluttered.
      hidden={isCaptureOpen}
    >
      <div className="mx-auto grid max-w-lg grid-cols-[1fr_auto_1fr] items-end gap-2">
        <NavTab href="/" active={onHome} label="Домой" icon={HOME_ICON} />

        <div
          className="-mt-10 flex items-center gap-1 rounded-[1.4rem] border border-white/80 bg-white/90 p-1.5 shadow-[0_18px_36px_-14px_rgba(23,32,51,0.30)] backdrop-blur-xl"
          role="group"
          aria-label="Добавить операцию"
        >
          <button
            type="button"
            onClick={openPhoto}
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl text-[#E66B43] transition hover:bg-[#FFF0E9] active:scale-95"
            aria-label="Фото чека"
          >
            {CAMERA_ICON}
          </button>
          <button
            type="button"
            onClick={openVoice}
            className="flex h-14 w-14 cursor-pointer items-center justify-center rounded-2xl bg-gradient-to-br from-[#6366F1] via-[#4F46E5] to-[#3730A3] text-white shadow-[0_12px_24px_-8px_rgba(79,70,229,0.62)] transition active:scale-95"
            aria-label="Голосовая запись"
          >
            {MIC_ICON}
          </button>
          <button
            type="button"
            onClick={openManual}
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl text-[#6366F1] transition hover:bg-[#EEF2FF] active:scale-95"
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
      className={`flex flex-col items-center gap-1 rounded-xl py-1.5 text-[10px] font-semibold transition ${
        active
          ? "text-[#4F46E5]"
          : "text-[#697386] hover:text-[#172033]"
      }`}
      aria-current={active ? "page" : undefined}
    >
      <span
        className={`flex h-7 w-7 items-center justify-center rounded-lg transition ${
          active ? "bg-[#E9EAFE]" : ""
        }`}
      >
        {icon}
      </span>
      <span>{label}</span>
    </Link>
  );
}
