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
      className="relative z-20 border-t border-line bg-surface-strong/92 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 shadow-dock backdrop-blur-xl"
      aria-label="Основная навигация"
      // Hide dock chrome under full-screen capture so confirm is uncluttered.
      hidden={isCaptureOpen}
    >
      <div className="mx-auto grid max-w-lg grid-cols-[1fr_auto_1fr] items-end gap-2">
        <NavTab href="/" active={onHome} label="Домой" icon={HOME_ICON} />

        <div
          className="-mt-9 flex items-center gap-1 rounded-[1.35rem] border border-line bg-surface-strong p-1.5 shadow-card"
          role="group"
          aria-label="Добавить операцию"
        >
          <button
            type="button"
            onClick={openPhoto}
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-[0.95rem] bg-expense-soft text-expense transition hover:brightness-95 active:scale-95"
            aria-label="Фото чека"
          >
            {CAMERA_ICON}
          </button>
          <button
            type="button"
            onClick={openVoice}
            className="relative flex h-14 w-14 cursor-pointer items-center justify-center overflow-hidden rounded-[1.05rem] text-white shadow-[0_12px_22px_-8px_rgba(79,70,229,0.62)] transition hover:brightness-105 active:scale-95"
            style={{ background: "var(--brand-fill)" }}
            aria-label="Голосовая запись"
          >
            {MIC_ICON}
          </button>
          <button
            type="button"
            onClick={openManual}
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-[0.95rem] bg-brand-soft text-brand transition hover:brightness-95 active:scale-95"
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
      className={`flex flex-col items-center gap-0.5 rounded-2xl py-1.5 text-[10px] font-semibold transition-[color,transform] duration-300 ease-out active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100 ${
        active
          ? "text-brand"
          : "text-ink-muted hover:text-ink"
      }`}
      aria-current={active ? "page" : undefined}
    >
      <span
        className={`nav-tab-icon flex h-8 w-8 items-center justify-center rounded-xl transition-[background-color,box-shadow,transform] duration-300 ease-out ${
          active
            ? "nav-tab-icon-active bg-brand-soft shadow-[0_6px_14px_-12px_rgba(79,70,229,0.48)]"
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
