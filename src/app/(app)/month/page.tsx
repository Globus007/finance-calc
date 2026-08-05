/**
 * Protected Month tab — stub Monthly total; live sums come later.
 */
export default function MonthPage() {
  return (
    <div className="px-4 pb-4 pt-3">
      <h1 className="text-2xl font-bold tracking-tight">Итог месяца</h1>
      <p className="mt-1 text-sm text-[#1A1B2E]/45">
        Календарный месяц · Europe/Minsk
      </p>

      <section className="mt-4 rounded-[1.75rem] bg-white p-5 shadow-[0_10px_40px_-12px_rgba(91,108,255,0.15)]">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-[#1A1B2E]/45">Нетто</p>
            <p className="mt-1 text-3xl font-bold tabular-nums">0,00 Br</p>
          </div>
          <span className="rounded-full bg-[#E0E7FF] px-2.5 py-1 text-[11px] font-bold text-[#4338CA]">
            пусто
          </span>
        </div>

        <div className="mt-6 flex h-28 items-end justify-center gap-8">
          <div className="flex flex-col items-center gap-2">
            <div className="h-3 w-12 rounded-t-xl bg-[#5B6CFF]/30" />
            <span className="text-[10px] font-medium text-[#1A1B2E]/45">
              Доход
            </span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="h-3 w-12 rounded-t-xl bg-[#F97316]/30" />
            <span className="text-[10px] font-medium text-[#1A1B2E]/45">
              Расход
            </span>
          </div>
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-3 border-t border-[#1A1B2E]/06 pt-4 text-sm">
          <div>
            <dt className="text-xs text-[#1A1B2E]/45">Доходы</dt>
            <dd className="mt-0.5 font-semibold tabular-nums text-[#10B981]">
              +0,00 Br
            </dd>
          </div>
          <div>
            <dt className="text-xs text-[#1A1B2E]/45">Расходы</dt>
            <dd className="mt-0.5 font-semibold tabular-nums text-[#F97316]">
              −0,00 Br
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
