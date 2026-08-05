"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconCamera, IconChart, IconHome, IconMic, IconPen } from "./icons";

/**
 * Home chrome bottom bar: Домой | photo · big mic · manual | Месяц.
 * Capture actions are stubs until later tickets wire pipelines.
 */
export function BottomNav() {
  const pathname = usePathname();
  const onHome = pathname === "/";
  const onMonth = pathname === "/month" || pathname.startsWith("/month/");

  return (
    <nav
      className="relative z-10 border-t border-white/60 bg-white/90 px-2 pb-3 pt-2 backdrop-blur-md"
      aria-label="Основная навигация"
    >
      <div className="mx-auto grid max-w-lg grid-cols-[1fr_auto_1fr] items-end gap-1">
        <NavTab
          href="/"
          active={onHome}
          label="Домой"
          icon={<IconHome size={20} />}
        />

        <div
          className="-mt-8 flex items-center gap-1.5 rounded-full border border-white/80 bg-white p-1.5 shadow-[0_12px_40px_-8px_rgba(26,27,46,0.25)]"
          role="group"
          aria-label="Захват"
        >
          <button
            type="button"
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-[#FF8A4C] transition hover:bg-[#FFF7ED] active:scale-95"
            aria-label="Фото чека"
            disabled
            title="Скоро"
          >
            <IconCamera size={20} />
          </button>
          <button
            type="button"
            className="flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-gradient-to-br from-[#5B6CFF] to-[#4338CA] text-white shadow-lg shadow-[#5B6CFF]/40 transition active:scale-95 disabled:opacity-90"
            aria-label="Голосовая запись"
            disabled
            title="Скоро"
          >
            <IconMic size={26} />
          </button>
          <button
            type="button"
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-[#A78BFA] transition hover:bg-[#F5F3FF] active:scale-95"
            aria-label="Вручную"
            disabled
            title="Скоро"
          >
            <IconPen size={20} />
          </button>
        </div>

        <NavTab
          href="/month"
          active={onMonth}
          label="Месяц"
          icon={<IconChart size={20} />}
        />
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
      className={`flex flex-col items-center gap-0.5 py-1 transition ${
        active ? "text-[#5B6CFF]" : "text-[#1A1B2E]/40"
      }`}
      aria-current={active ? "page" : undefined}
    >
      {icon}
      <span className="text-[10px] font-semibold">{label}</span>
    </Link>
  );
}
