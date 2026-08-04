"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect } from "react";

export type VariantMeta = { key: string; name: string };

type Props = {
  variants: VariantMeta[];
  current: string;
};

/** Floating prototype control — not part of product UI (issue #8) */
export function PrototypeSwitcher({ variants, current }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const go = useCallback(
    (key: string) => {
      const p = new URLSearchParams(searchParams.toString());
      p.set("variant", key);
      router.replace(`?${p.toString()}`);
    },
    [router, searchParams],
  );

  const idx = Math.max(
    0,
    variants.findIndex((v) => v.key === current),
  );
  const meta = variants[idx] ?? variants[0];

  const prev = () => {
    const next = variants[(idx - 1 + variants.length) % variants.length];
    go(next.key);
  };
  const next = () => {
    const n = variants[(idx + 1) % variants.length];
    go(n.key);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.isContentEditable)
      ) {
        return;
      }
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, variants]);

  if (process.env.NODE_ENV === "production") return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-full border border-white/20 bg-zinc-900 px-2 py-1.5 text-white shadow-2xl shadow-black/40">
      <button
        type="button"
        onClick={prev}
        className="rounded-full px-3 py-1.5 text-lg leading-none hover:bg-white/10"
        aria-label="Previous variant"
      >
        ←
      </button>
      <div className="min-w-[11rem] px-2 text-center text-sm font-medium tracking-tight">
        <span className="text-amber-300">{meta.key}</span>
        <span className="text-white/40"> — </span>
        <span>{meta.name}</span>
      </div>
      <button
        type="button"
        onClick={next}
        className="rounded-full px-3 py-1.5 text-lg leading-none hover:bg-white/10"
        aria-label="Next variant"
      >
        →
      </button>
    </div>
  );
}
