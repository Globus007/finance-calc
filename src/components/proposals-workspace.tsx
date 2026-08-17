"use client";

import { useMemo, useState } from "react";

type SlotKey = "gallery" | "materials" | "packages" | "payments" | "terms" | "cta";

type Proposal = {
  title: string;
  client: string;
  template: string;
  brandName: string;
  managerName: string;
  phone: string;
  email: string;
  lead: string;
  gallery: string[];
  materials: { name: string; description: string }[];
  packages: { name: string; price: string; description: string; recommended: boolean }[];
  payments: { title: string; body: string }[];
  terms: { manufacturing: string; installation: string; warranty: string };
  cta: { headline: string; body: string; phone: string; buttonLabel: string };
};

const initialProposal: Proposal = {
  title: "Кухня для проекта на Речной",
  client: "Анна Петрова",
  template: "Глина",
  brandName: "Студия кухонь Forma",
  managerName: "Мария Орлова",
  phone: "+7 (900) 123-45-67",
  email: "hello@forma-kuhni.ru",
  lead: "Спроектируем кухню, которая будет работать на ваш ритм жизни.",
  gallery: ["Проект кухни на Речной", "Остров и рабочая зона"],
  materials: [
    { name: "Фасады Fenix NTM 0720", description: "Матовый практичный материал, устойчивый к отпечаткам." },
    { name: "Столешница Technistone", description: "Кварцевый агломерат с деликатным рисунком камня." },
  ],
  packages: [
    { name: "Комфорт", price: "248000", description: "Фасады, фурнитура и столешница для ежедневного комфорта.", recommended: true },
    { name: "Премиум", price: "382000", description: "Расширенная комплектация с подсветкой и органайзерами.", recommended: false },
  ],
  payments: [
    { title: "50% при заключении договора", body: "Оставшаяся сумма — после монтажа кухни." },
    { title: "Рассрочка без переплаты", body: "Разобьём оплату на удобные этапы." },
  ],
  terms: { manufacturing: "35 рабочих дней", installation: "2 дня", warranty: "24 месяца" },
  cta: { headline: "Готовы обсудить проект?", body: "Позвоните — ответим на вопросы и назначим встречу в салоне.", phone: "+7 (900) 123-45-67", buttonLabel: "Позвонить" },
};

const slotLabels: Record<SlotKey, string> = {
  gallery: "Галерея",
  materials: "Материалы",
  packages: "Варианты комплектации",
  payments: "Оплата",
  terms: "Сроки и гарантии",
  cta: "CTA",
};

export function ProposalsWorkspace() {
  const [tab, setTab] = useState<"proposals" | "materials" | "profile">("proposals");
  const [proposal, setProposal] = useState(initialProposal);
  const [enabled, setEnabled] = useState<Record<SlotKey, boolean>>({ gallery: true, materials: true, packages: true, payments: true, terms: false, cta: true });
  const [status, setStatus] = useState<"Черновик" | "Опубликованное КП">("Черновик");
  const [pdf, setPdf] = useState<"—" | "pending" | "ready">("—");
  const [notice, setNotice] = useState("Изменения сохранены автоматически");

  const errors = useMemo(() => {
    const result: string[] = [];
    if (!proposal.title.trim()) result.push("Укажите название КП");
    if (!proposal.client.trim()) result.push("Укажите имя Клиента");
    if (!proposal.brandName.trim() || !proposal.phone.trim()) result.push("В Шапке нужны название Бренда и телефон");
    if (enabled.gallery && proposal.gallery.length < 1) result.push("Добавьте хотя бы одно фото в Галерею");
    if (enabled.materials && proposal.materials.length < 1) result.push("Добавьте хотя бы один Снимок Материала");
    if (enabled.packages && proposal.packages.length < 1) result.push("Добавьте хотя бы один Вариант комплектации");
    if (enabled.payments && proposal.payments.length < 1) result.push("Добавьте хотя бы одну Опцию оплаты");
    if (enabled.terms && !Object.values(proposal.terms).some(Boolean)) result.push("Заполните хотя бы одно поле в Сроках и гарантиях");
    if (enabled.cta && (!proposal.cta.phone.trim() || !proposal.cta.buttonLabel.trim())) result.push("В CTA нужны телефон и подпись кнопки");
    return result;
  }, [proposal, enabled]);

  function update<K extends keyof Proposal>(key: K, value: Proposal[K]) {
    setProposal((current) => ({ ...current, [key]: value }));
    setNotice("Сохранение…");
    window.setTimeout(() => setNotice("Изменения сохранены автоматически"), 450);
  }

  function publish() {
    if (errors.length) {
      setNotice(`Нельзя опубликовать: ${errors[0]}`);
      return;
    }
    setStatus("Опубликованное КП");
    setPdf("pending");
    setNotice("КП опубликовано. PDF готовится асинхронно");
    window.setTimeout(() => setPdf("ready"), 1200);
  }

  if (tab !== "proposals") {
    return <CabinetShell tab={tab} onTab={setTab}><PlaceholderTab tab={tab} /></CabinetShell>;
  }

  return (
    <CabinetShell tab={tab} onTab={setTab}>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><p className="ui-kicker">Редактор КП</p><h1 className="mt-1 text-2xl font-extrabold tracking-[-0.04em]">{proposal.title || "Без названия"}</h1><p className="mt-1 text-sm text-ink-muted">Клиент: {proposal.client || "не указан"} · {notice}</p></div>
            <div className="flex gap-2"><button className="rounded-control border border-line bg-surface-strong px-3 py-2 text-sm font-bold text-ink" onClick={() => setStatus("Черновик")}>Снять с публикации</button><button className="rounded-control bg-brand px-4 py-2 text-sm font-bold text-white shadow-card" onClick={publish}>{status === "Опубликованное КП" ? "Обновить публикацию" : "Опубликовать"}</button></div>
          </div>

          <EditorCard title="Основные данные" hint="Поля на корне КП">
            <div className="grid gap-3 md:grid-cols-2"><Field label="Название КП" value={proposal.title} onChange={(value) => update("title", value)} /><Field label="Имя Клиента" value={proposal.client} onChange={(value) => update("client", value)} /></div>
            <div className="mt-3 flex items-center justify-between rounded-control bg-brand-soft px-3 py-3"><div><p className="text-sm font-bold text-brand">Шаблон: {proposal.template}</p><p className="text-xs text-ink-muted">Оформление меняет только визуальный skin КП.</p></div><select value={proposal.template} onChange={(event) => update("template", event.target.value)} className="rounded-lg border border-line bg-surface-strong px-2 py-1.5 text-sm"><option>Глина</option><option>Лён</option><option>Графит</option></select></div>
          </EditorCard>

          <EditorCard title="Шапка" hint="Всегда включена"><div className="grid gap-3 md:grid-cols-2"><Field label="Название Бренда" value={proposal.brandName} onChange={(value) => update("brandName", value)} required /><Field label="Имя Менеджера" value={proposal.managerName} onChange={(value) => update("managerName", value)} /><Field label="Телефон" value={proposal.phone} onChange={(value) => update("phone", value)} required /><Field label="Email" value={proposal.email} onChange={(value) => update("email", value)} /></div><TextArea label="Lead (необязательно)" value={proposal.lead} onChange={(value) => update("lead", value)} /></EditorCard>

          <SlotCard label="Галерея" enabled={enabled.gallery} onToggle={() => setEnabled({ ...enabled, gallery: !enabled.gallery })}><div className="grid grid-cols-2 gap-3 md:grid-cols-4">{proposal.gallery.map((name, index) => <div key={name} className="flex aspect-[4/3] items-end rounded-xl bg-gradient-to-br from-[#D6C7B8] via-[#B7A58D] to-[#6E665A] p-2 text-xs font-bold text-white shadow-inner"><span>{index + 1}. {name}</span></div>)}<button className="flex aspect-[4/3] items-center justify-center rounded-xl border border-dashed border-brand/40 bg-brand-soft text-sm font-bold text-brand" onClick={() => update("gallery", [...proposal.gallery, `Фото проекта ${proposal.gallery.length + 1}`])}>+ Добавить фото</button></div></SlotCard>

          <SlotCard label="Материалы" enabled={enabled.materials} onToggle={() => setEnabled({ ...enabled, materials: !enabled.materials })}><div className="space-y-2">{proposal.materials.map((material, index) => <div key={`${material.name}-${index}`} className="rounded-xl border border-line bg-surface-strong p-3"><div className="flex items-center justify-between gap-3"><div><p className="font-bold">{material.name}</p><p className="mt-1 text-sm text-ink-muted">{material.description}</p></div><span className="rounded-full bg-positive-soft px-2 py-1 text-[11px] font-bold text-positive">Снимок</span></div></div>)}</div><button className="mt-3 rounded-control bg-brand-soft px-3 py-2 text-sm font-bold text-brand" onClick={() => update("materials", [...proposal.materials, { name: "Новый материал", description: "Описание образца" }])}>+ Вставить из библиотеки</button></SlotCard>

          <SlotCard label="Варианты комплектации" enabled={enabled.packages} onToggle={() => setEnabled({ ...enabled, packages: !enabled.packages })}><div className="grid gap-3 md:grid-cols-2">{proposal.packages.map((item, index) => <div key={item.name} className="rounded-xl border border-line bg-surface-strong p-4"><div className="flex items-center justify-between"><p className="font-bold">{item.name}</p>{item.recommended && <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-700">Рекомендуем</span>}</div><p className="mt-2 text-xl font-extrabold">{Number(item.price || 0).toLocaleString("ru-RU")} ₽</p><p className="mt-1 text-sm text-ink-muted">{item.description}</p></div>)}</div><button className="mt-3 rounded-control bg-brand-soft px-3 py-2 text-sm font-bold text-brand" onClick={() => proposal.packages.length < 3 && update("packages", [...proposal.packages, { name: "Новый вариант", price: "0", description: "Описание комплектации", recommended: false }])}>+ Добавить вариант</button></SlotCard>

          <SlotCard label="Оплата" enabled={enabled.payments} onToggle={() => setEnabled({ ...enabled, payments: !enabled.payments })}><div className="space-y-2">{proposal.payments.map((item) => <div key={item.title} className="rounded-xl border border-line bg-surface-strong p-3"><p className="font-bold">{item.title}</p><p className="mt-1 text-sm text-ink-muted">{item.body}</p></div>)}</div></SlotCard>
          <SlotCard label="Сроки и гарантии" enabled={enabled.terms} onToggle={() => setEnabled({ ...enabled, terms: !enabled.terms })}><div className="grid gap-3 md:grid-cols-3"><Field label="Изготовление" value={proposal.terms.manufacturing} onChange={(value) => update("terms", { ...proposal.terms, manufacturing: value })} /><Field label="Монтаж" value={proposal.terms.installation} onChange={(value) => update("terms", { ...proposal.terms, installation: value })} /><Field label="Гарантия" value={proposal.terms.warranty} onChange={(value) => update("terms", { ...proposal.terms, warranty: value })} /></div></SlotCard>
          <SlotCard label="CTA" enabled={enabled.cta} onToggle={() => setEnabled({ ...enabled, cta: !enabled.cta })}><div className="grid gap-3 md:grid-cols-2"><Field label="Заголовок" value={proposal.cta.headline} onChange={(value) => update("cta", { ...proposal.cta, headline: value })} /><Field label="Телефон" value={proposal.cta.phone} onChange={(value) => update("cta", { ...proposal.cta, phone: value })} required /><Field label="Подпись кнопки" value={proposal.cta.buttonLabel} onChange={(value) => update("cta", { ...proposal.cta, buttonLabel: value })} required /><TextArea label="Текст" value={proposal.cta.body} onChange={(value) => update("cta", { ...proposal.cta, body: value })} /></div></SlotCard>
        </section>

        <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start"><div className="flex items-center justify-between"><div><p className="ui-kicker">Live preview</p><h2 className="ui-title">Предпросмотр выдачи</h2></div><span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${status === "Опубликованное КП" ? "bg-positive-soft text-positive" : "bg-amber-100 text-amber-700"}`}>{status}</span></div><div className="overflow-hidden rounded-[1.5rem] border border-line bg-[#FBF8F3] shadow-card"><div className="bg-[#2F3831] p-5 text-white"><p className="text-xs uppercase tracking-[0.16em] text-white/60">{proposal.brandName}</p><h3 className="mt-8 text-2xl font-extrabold tracking-[-0.04em]">{proposal.title || "Без названия"}</h3><p className="mt-2 text-sm text-white/70">Для {proposal.client || "Клиента"}</p></div><div className="space-y-5 p-5"><PreviewBlock title="Материалы"><p className="text-sm text-ink-muted">{proposal.materials.map((item) => item.name).join(" · ")}</p></PreviewBlock><PreviewBlock title="Варианты комплектации"><div className="space-y-2">{proposal.packages.map((item) => <div key={item.name} className="flex items-center justify-between rounded-lg bg-white px-3 py-2"><span className="text-sm font-bold">{item.name}</span><span className="text-sm font-extrabold">{Number(item.price || 0).toLocaleString("ru-RU")} ₽</span></div>)}</div></PreviewBlock>{enabled.cta && <div className="rounded-xl bg-[#DDE5D8] p-4"><p className="font-bold">{proposal.cta.headline}</p><p className="mt-1 text-sm text-ink-muted">{proposal.cta.body}</p><button className="mt-3 w-full rounded-lg bg-[#2F3831] px-3 py-2 text-sm font-bold text-white">{proposal.cta.buttonLabel}</button></div>}</div></div><div className="rounded-control border border-line bg-surface-strong p-4"><p className="text-sm font-bold">Публичная ссылка</p><p className="mt-1 truncate text-xs text-ink-muted">{status === "Опубликованное КП" ? "forma-kukhni.ru/p/8e3d…" : "Появится после первой публикации"}</p><div className="mt-3 flex items-center justify-between"><span className="text-sm text-ink-muted">PDF</span><span className={`text-sm font-bold ${pdf === "ready" ? "text-positive" : "text-ink-muted"}`}>{pdf === "ready" ? "Готов" : pdf === "pending" ? "Готовится…" : "Не создан"}</span></div>{pdf === "ready" && <button className="mt-3 w-full rounded-lg bg-brand-soft px-3 py-2 text-sm font-bold text-brand">Скачать PDF</button>}</div>{errors.length > 0 && <div className="rounded-control bg-amber-50 p-4 text-sm text-amber-800"><p className="font-bold">Проверка публикации</p><p className="mt-1">Сейчас ошибок: {errors.length}. Они проверяются только при публикации.</p></div>}</aside>
      </div>
    </CabinetShell>
  );
}

function CabinetShell({ children, tab, onTab }: { children: React.ReactNode; tab: string; onTab: (tab: "proposals" | "materials" | "profile") => void }) {
  return <div className="min-h-full bg-[#F4F1EB] p-4 pb-8 md:p-6"><header className="mb-6 flex flex-wrap items-center justify-between gap-4"><div><p className="ui-kicker">FORMA · кабинет Менеджера</p><p className="mt-1 text-xl font-extrabold tracking-[-0.04em]">Генератор коммерческих предложений</p></div><div className="rounded-full border border-line bg-surface-strong px-3 py-2 text-xs font-bold text-ink-muted">Мария Орлова · Бренд Forma</div></header><nav className="mb-6 flex gap-1 overflow-x-auto rounded-xl border border-line bg-surface-strong p-1">{([["proposals", "Список КП"], ["materials", "Библиотека материалов"], ["profile", "Профиль Бренда"]] as const).map(([key, label]) => <button key={key} onClick={() => onTab(key)} className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-bold transition ${tab === key ? "bg-brand text-white" : "text-ink-muted hover:bg-brand-soft hover:text-brand"}`}>{label}</button>)}</nav>{children}</div>;
}

function PlaceholderTab({ tab }: { tab: string }) { return <div className="rounded-2xl border border-line bg-surface-strong p-6"><p className="ui-kicker">Раздел кабинета</p><h1 className="mt-1 text-2xl font-extrabold">{tab === "materials" ? "Библиотека Материалов" : "Профиль Бренда"}</h1><p className="mt-3 max-w-xl text-sm leading-6 text-ink-muted">Раздел подготовлен для каталога и профиля Бренда. В MVP новые КП создаются только при валидном профиле, а Материалы вставляются в КП снимками и не меняют библиотеку.</p></div>; }
function EditorCard({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) { return <div className="rounded-2xl border border-line bg-surface-strong p-4 shadow-card"><div className="mb-4 flex items-center justify-between"><div><h2 className="font-extrabold">{title}</h2><p className="mt-0.5 text-xs text-ink-muted">{hint}</p></div></div>{children}</div>; }
function SlotCard({ label, enabled, onToggle, children }: { label: string; enabled: boolean; onToggle: () => void; children: React.ReactNode }) { return <EditorCard title={label} hint={enabled ? "Включён в публичную выдачу" : "Выключен, данные сохраняются"}><div className="mb-4 flex justify-end"><button type="button" role="switch" aria-checked={enabled} onClick={onToggle} className={`rounded-full px-3 py-1.5 text-xs font-bold ${enabled ? "bg-positive-soft text-positive" : "bg-slate-100 text-slate-500"}`}>{enabled ? "Включён" : "Выключен"}</button></div>{enabled ? children : <p className="rounded-xl bg-slate-50 p-4 text-sm text-ink-muted">Слот скрыт у Клиента. Данные сохраняются и могут быть включены перед публикацией.</p>}</EditorCard>; }
function Field({ label, value, onChange, required }: { label: string; value: string; onChange: (value: string) => void; required?: boolean }) { return <label className="block text-sm font-bold"><span>{label}{required && <em className="ml-1 not-italic text-expense">*</em>}</span><input value={value} onChange={(event) => onChange(event.target.value)} className="mt-1.5 w-full rounded-lg border border-line bg-[#FCFBF8] px-3 py-2.5 text-sm font-medium outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15" /></label>; }
function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="mt-3 block text-sm font-bold"><span>{label}</span><textarea value={value} onChange={(event) => onChange(event.target.value)} rows={3} className="mt-1.5 w-full resize-y rounded-lg border border-line bg-[#FCFBF8] px-3 py-2.5 text-sm font-medium outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15" /></label>; }
function PreviewBlock({ title, children }: { title: string; children: React.ReactNode }) { return <div><p className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.16em] text-ink-muted">{title}</p>{children}</div>; }
