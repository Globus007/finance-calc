import Link from "next/link";
import { IconTags } from "@/components/icons";

/**
 * Protected Home shell — stub content; money data arrives in later tickets.
 */
export default function HomePage() {
  return (
    <div className="px-4 pb-6 pt-3">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#5B6CFF] to-[#818CF8] text-sm font-bold text-white shadow-md shadow-[#5B6CFF]/30"
            aria-hidden
          >
            Br
          </div>
          <div>
            <p className="text-xs text-[#1A1B2E]/45">Привет</p>
            <p className="text-base font-semibold tracking-tight">Финансы</p>
          </div>
        </div>
        <Link
          href="/categories"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#5B6CFF] shadow-sm shadow-black/5 transition active:scale-95"
          aria-label="Категории"
        >
          <IconTags size={18} />
        </Link>
      </header>

      <section
        className="relative mt-5 overflow-hidden rounded-[1.75rem] bg-white px-5 py-6 shadow-[0_10px_40px_-12px_rgba(91,108,255,0.18)]"
        aria-label="Итог месяца"
      >
        <div className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-[#E0E7FF]" />
        <div className="pointer-events-none absolute -bottom-8 left-10 h-24 w-24 rounded-full bg-[#F3E8FF]" />
        <p className="relative text-xs font-medium text-[#1A1B2E]/45">
          Нетто · текущий месяц
        </p>
        <p className="relative mt-1 text-[2rem] font-bold tracking-tight tabular-nums">
          0,00 Br
        </p>
        <div className="relative mt-4 flex gap-6">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-[#1A1B2E]/35">
              Доходы
            </p>
            <p className="mt-0.5 text-sm font-semibold tabular-nums text-[#10B981]">
              +0,00 Br
            </p>
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-[#1A1B2E]/35">
              Расходы
            </p>
            <p className="mt-0.5 text-sm font-semibold tabular-nums text-[#F97316]">
              −0,00 Br
            </p>
          </div>
        </div>
      </section>

      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-base font-bold tracking-tight">Последние</h2>
        <span className="text-xs font-semibold text-[#5B6CFF]/50">Все</span>
      </div>
      <p className="mt-4 rounded-2xl bg-white px-4 py-8 text-center text-sm text-[#1A1B2E]/45 shadow-[0_4px_16px_-8px_rgba(26,27,46,0.12)]">
        Пока нет записей. Добавьте расход или доход через панель захвата.
      </p>
    </div>
  );
}
