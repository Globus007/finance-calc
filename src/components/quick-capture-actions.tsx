"use client";

import { useCapture } from "@/components/capture/capture-flow";
import { IconCamera, IconMic, IconPen } from "@/components/icons";

/**
 * Persistent quick actions for the PWA home screen.
 * The panel starts in the first viewport and remains sticky while the user
 * reads the balance, categories, or history.
 */
export function QuickCaptureActions() {
  const { openManual, openPhoto, openVoice } = useCapture();

  return (
    <section
      className="rounded-[1.55rem] border border-white/85 bg-white/88 p-2 shadow-[0_16px_28px_-22px_rgba(23,32,51,0.45)] backdrop-blur-xl"
      aria-label="Быстрое добавление операции"
    >
      <div className="flex items-center justify-between px-2 pb-2 pt-1">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#697386]">
            Быстрое действие
          </p>
          <p className="mt-0.5 text-sm font-bold tracking-[-0.02em] text-[#172033]">
            Добавить операцию
          </p>
        </div>
        <span className="rounded-full bg-[#E9EAFE] px-2.5 py-1 text-[10px] font-bold text-[#4F46E5]">
          В 1 касание
        </span>
      </div>

      <div className="grid grid-cols-3 gap-1.5" role="group" aria-label="Способ внесения операции">
        <ActionButton
          label="Вручную"
          detail="Расход"
          icon={<IconPen size={20} />}
          tone="manual"
          onClick={openManual}
        />
        <ActionButton
          label="Фото"
          detail="Чек"
          icon={<IconCamera size={20} />}
          tone="photo"
          onClick={openPhoto}
        />
        <ActionButton
          label="Голос"
          detail="Сказать"
          icon={<IconMic size={20} />}
          tone="voice"
          onClick={openVoice}
        />
      </div>
    </section>
  );
}

function ActionButton({
  label,
  detail,
  icon,
  tone,
  onClick,
}: {
  label: string;
  detail: string;
  icon: React.ReactNode;
  tone: "manual" | "photo" | "voice";
  onClick: () => void;
}) {
  const styles = {
    manual:
      "bg-[#EEF2FF] text-[#4F46E5] hover:bg-[#E0E7FF] focus-visible:outline-[#818CF8]",
    photo:
      "bg-[#FFF0E9] text-[#E66B43] hover:bg-[#FFE4D5] focus-visible:outline-[#FB923C]",
    voice:
      "bg-[#E8FAF5] text-[#0F9F80] hover:bg-[#D5F5EA] focus-visible:outline-[#2DD4BF]",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-20 cursor-pointer flex-col items-start justify-between rounded-[1.15rem] p-3 text-left transition active:scale-[0.97] ${styles[tone]}`}
      aria-label={`${label}: ${detail}`}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/65 shadow-sm">
        {icon}
      </span>
      <span className="mt-2">
        <span className="block text-xs font-bold leading-none">{label}</span>
        <span className="mt-1 block text-[10px] font-semibold opacity-70">{detail}</span>
      </span>
    </button>
  );
}
