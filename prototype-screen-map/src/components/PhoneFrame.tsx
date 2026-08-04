/** Mobile PWA viewport shell for all variants */

export function PhoneFrame({
  children,
  chrome,
}: {
  children: React.ReactNode;
  chrome?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3">
      {chrome ? (
        <p className="max-w-sm text-center text-xs uppercase tracking-[0.2em] text-zinc-500">
          {chrome}
        </p>
      ) : null}
      <div className="relative h-[720px] w-[360px] overflow-hidden rounded-[2rem] border border-zinc-800/80 bg-black shadow-[0_30px_80px_-20px_rgba(0,0,0,0.55)] ring-1 ring-white/10">
        <div className="absolute inset-x-0 top-0 z-20 flex h-7 items-end justify-center pb-1">
          <div className="h-5 w-28 rounded-full bg-black/80" />
        </div>
        <div className="absolute inset-0 pt-7">{children}</div>
      </div>
    </div>
  );
}
