---
name: Финансы
description: Capture-first personal cash tracker in BYN — a watercolor till with ink figures.
colors:
  ink: "#16141f"
  ink-muted: "#6d6a78"
  canvas: "#ebe6f4"
  surface: "#f3eef8"
  surface-strong: "#ffffff"
  line: "#ece7f2"
  brand: "#6d5ef5"
  brand-deep: "#1a1a22"
  brand-soft: "#ece8ff"
  positive: "#1a9a68"
  positive-soft: "#e4f7ee"
  expense: "#e0454a"
  expense-soft: "#fde8e8"
  hero: "#1a1a22"
  hero-caption: "#cfc9e0"
  income-bright: "#99f6e4"
  expense-bright: "#fed7aa"
  error: "#C44822"
typography:
  display:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: "2.65rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.04em"
    fontFeature: "tnum"
  headline:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: "1.55rem"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.04em"
  title:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.03em"
  body:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "normal"
  label:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: "0.625rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.16em"
rounded:
  card: "1.25rem"
  hero: "1.75rem"
  control: "1.15rem"
  pill: "999px"
  frame: "2rem"
  row: "1rem"
spacing:
  sm: "0.5rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "1.75rem"
  page: "0.85rem 1rem 1.5rem"
components:
  button-primary:
    backgroundColor: "{colors.brand-deep}"
    textColor: "{colors.surface-strong}"
    typography: "{typography.body}"
    rounded: "{rounded.pill}"
    padding: "0.85rem 1rem"
  button-primary-hover:
    backgroundColor: "{colors.brand-deep}"
    textColor: "{colors.surface-strong}"
    rounded: "{rounded.pill}"
    padding: "0.85rem 1rem"
  button-oauth:
    backgroundColor: "{colors.surface-strong}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "0.875rem 1rem"
  field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "0.75rem 1rem"
  field-focus:
    backgroundColor: "{colors.surface-strong}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0.75rem 1rem"
  card:
    backgroundColor: "{colors.surface-strong}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "1rem"
  hero-well:
    backgroundColor: "{colors.hero}"
    textColor: "{colors.surface-strong}"
    typography: "{typography.display}"
    rounded: "{rounded.hero}"
    padding: "1.25rem"
  chip:
    backgroundColor: "{colors.surface-strong}"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.pill}"
    padding: "0.5rem 0.875rem"
  chip-selected:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.surface-strong}"
    rounded: "{rounded.pill}"
    padding: "0.5rem 0.875rem"
  nav-tab-active:
    backgroundColor: "#2a2348"
    textColor: "{colors.surface-strong}"
    rounded: "{rounded.row}"
    size: "2.25rem"
---

# Design System: Финансы

## Overview

**Creative North Star: "The Watercolor Till"**

The product is a pocket till on watercolor paper. Cash on hand — Remainder — sits as ink on a dusk wash of lilac, peach, and mint. Lists and tools live in white envelopes that rest on that wash, not in a gray application chrome. Capture is a physical gesture: a floating charcoal microphone, camera and pen beside it, committed with a charcoal pill. The atmosphere is warm and personal; the hierarchy is the number.

Density is mobile-first and unhurried. One narrow column, generous card radii, short Russian labels, and a single large figure at a time. Brand personality is soft and capture-first, not analytical. The shipping look already lives in the same watercolor-dusk family as the bound Dribbble look-reference; it does not import that reference’s AI-chat IA, GBP, named fictional user, or assistant chrome.

Confirmed visual rejections: a cold fintech dashboard; neon accents painted across a whole screen; Periwinkle as the primary button fill; glassmorphism stacks; a dark-mode shell.

**Key Characteristics:**
- Watercolor dusk canvas (lilac, peach, mint washes) inside a pocket-width column
- Ink Night remainder as the hero figure; white envelopes for lists and tools
- Periwinkle as brand voice and focus, never as the commit fill
- Soft envelopes (1.25–1.75rem) and charcoal pills for commitment
- Hybrid depth: paper layers plus ambient lift
- Manrope everywhere; Geist Mono only for the six-digit OTP

## Colors

A cool lilac paper field, two inks (night and periwinkle), and a tight semantic pair for money in and money out.

### Primary
- **Periwinkle** (`brand`): Brand voice — uppercase kickers, back links, selected category chips, focus rings, caret. Rare on the surface so it still reads as a signal.
- **Ink Night** (`brand-deep`, `hero`): Commitment and the figure. Primary pills, the `Br` mark, the mic, hero wells (amount confirm, monthly net). Slightly cooler than body ink.

### Secondary
- **Till Green** (`positive`): Income amounts, inflow glyphs, “plus” status. Soft wash (`positive-soft`) behind the glyph well. On dark hero tiles, lift to **Mint Bright** (`income-bright`).

### Tertiary
- **Coral Debit** (`expense`): Expense amounts on tiles, breakdown bars, destructive emphasis. Soft wash (`expense-soft`) behind outflow glyphs. On dark hero tiles, lift to **Peach Bright** (`expense-bright`). Alert copy on light paper uses **Burnt Error** (`error`) — warmer and darker than the expense figure, for readable warnings.

### Neutral
- **Body Ink** (`ink`): Default text and icons on paper.
- **Dusty Mauve** (`ink-muted`): Captions, inactive tabs, helper copy.
- **Lilac Mist** (`canvas`): Viewport and `theme-color`; the wash sits on top of it.
- **Lavender Tissue** (`surface`): Field fills and capture-sheet background.
- **White Envelope** (`surface-strong`): Cards, dock cluster, list panels.
- **Lavender Hairline** (`line`): Card edges, dividers, unselected chip borders.
- **Lilac Whisper** (`brand-soft`): Focus halo and selected-info washes.
- **Dusk Caption** (`hero-caption`): Labels sitting on Ink Night wells.

### Named Rules
**The Two Inks Rule.** Ink Night speaks with action and number. Periwinkle speaks with brand voice and focus. Do not fill the primary CTA with Periwinkle.

## Typography

**Display Font:** Manrope (with system-ui, sans-serif)
**Body Font:** Manrope (with system-ui, sans-serif)
**Label/Mono Font:** Geist Mono (with ui-monospace) — OTP code only

**Character:** Geometric, slightly wide, Cyrillic-native. Tight negative tracking on titles so figures feel like a single stamp, not a spreadsheet.

### Hierarchy
- **Display** (700, 2.65rem / 2.85rem from `sm`, line-height 1, tracking −0.04em, tabular-nums): Remainder on Home; monthly net on the hero card. Confirm amount uses a slightly smaller display (2.1rem) on the Ink Night well.
- **Headline** (700, 1.55rem, tracking −0.04em): Screen titles — «Итог месяца», «История», «Категории», confirm headings. Login «Вход» steps up to 1.875rem.
- **Title** (700, 1.05–1.15rem, tracking −0.03em): Wordmark «Финансы», section heads («История», «По категориям»), `ui-title`.
- **Body** (400–600, 0.875rem / 13px, line-height ~1.55): UI copy, history titles, helper text. Keep line length short; this is a pocket column, not an article.
- **Label** (700, 0.625rem, tracking 0.16em, uppercase): `ui-kicker` field names and «Новая операция». Nav labels are 10px semibold, sentence case, not this kicker.

### Named Rules
**The Tabular Remainder Rule.** Money is always `tabular-nums`, bold, and tightly tracked. Never set an amount in a proportional, light, or decorative face.

## Layout

A single pocket column: `max-w-lg` (32rem), full-bleed on the phone, framed as a device on `md` (768px) with 2rem corners, a hairline white border, and a long ambient shadow. Vertical page padding is `0.85rem 1rem 1.5rem` (`ui-page`). Safe-area insets pad the top of the shell and the dock.

Rhythm: header, then 1.75rem to Remainder, 1.5rem to the next envelope, 0.625rem between the income/expense pair. Capture occupies a full-screen sheet over the shell; the dock hides while it is open. Desktop never becomes a multi-column dashboard — the frame is still the phone.

The canvas behind the frame is Lilac Mist. Inside the frame, three radial washes (lilac upper-left, peach upper-right, mint at the dock) over a vertical dusk gradient. Scroll lives in `main`; the dock stays pinned.

**The Pocket Column Rule.** New screens inherit the 32rem column and the framed-phone desktop. Do not grow into a wide app grid.

## Elevation & Depth

Hybrid: paper layers first, ambient lift second. White envelopes and the dock sit on the watercolor; Ink Night wells sit slightly higher. Shadows are cool-ink, large blur, negative spread — a dusk, not a material card deck.

### Shadow Vocabulary
- **Envelope** (`box-shadow: 0 10px 28px -18px rgb(22 20 31 / 0.45)`): White cards, history panel, month tiles, icon buttons in the header.
- **Hero well** (`box-shadow: 0 22px 40px -22px rgb(22 20 31 / 0.55)`): Monthly net card and confirm amount well.
- **Dock** (`box-shadow: 0 14px 32px -18px rgb(22 20 31 / 0.38)`): Floating capture cluster.
- **Commit pill** (`box-shadow: 0 12px 24px -14px rgb(26 26 34 / 0.65)`): Primary button.
- **Mic** (`box-shadow: 0 12px 22px -10px rgba(26, 26, 34, 0.7)`): Center capture control.
- **Desktop frame** (`box-shadow: 0 32px 80px -36px rgb(22 20 31 / 0.45)`): The phone shell on `md`.

Focus is a 3px Periwinkle-mix outline, 3px offset (fields also get a 4px `brand-soft` halo). Pressed controls scale to 0.99 or 0.95. Honor `prefers-reduced-motion`.

### Named Rules
**The Paper-On-Watercolor Rule.** Surfaces are white envelopes or Ink Night wells on the dusk wash. Do not introduce a gray app background, a heavy drop-shadow stack, or a glass pane as the default layer.

## Shapes

Large, even, envelope-like corners. Cards 1.25rem; list panels and hero wells 1.75rem; fields and secondary buttons 1.15rem; commitment and the capture cluster are pills (999px). Icon wells on history rows are ~0.85rem squarcles; active nav icon well is ~0.9rem. The `Br` mark is a circle on Home and a squircle on Login — both Ink Night. Never use a 4px “Material small” radius; never use a sharp rectangle.

Hairlines are lavender, not charcoal. Selected chips drop the hairline and fill with Periwinkle. Segmented kind-switch (Расход / Доход) is a white envelope with an Ink Night selected cell.

**The Soft Envelope Rule.** If it holds content, it is an envelope (1.25–1.75rem) or a pill. Sharp corners and hairline-only cards are out of world.

## Components

Soft tools, charcoal commitment. Fields and cards are paper; primary CTA and the mic are Ink Night stone. Periwinkle marks the chosen chip and the kicker, not the save button.

### Buttons
- **Shape:** Pill for primary (999px); squircle 1.15rem for OAuth, text, and capture-sheet secondaries.
- **Primary:** Ink Night fill, white 0.875rem bold copy, 0.85rem 1rem padding (often 0.875rem vertical at full width), cool commit shadow. Hover brightens 5%; active scales to 0.99; disabled at 38% opacity.
- **Hover / Focus:** No color-role change on hover. Focus-visible is the shared 3px Periwinkle-mix ring.
- **Secondary / Ghost:** OAuth rows are white with lavender hairline, 0.875rem bold ink; hover tints the border toward `brand-soft`. Text actions (discard, change email) are bold Periwinkle or Dusty Mauve on a transparent squircle.

### Chips
- **Style:** Pill, 0.5rem 0.875rem, 12px semibold. Unselected: white, lavender hairline, Dusty Mauve label.
- **State:** Selected fills Periwinkle with white label and a short violet shadow. Expense category on confirm; do not use chips as navigation.

### Cards / Containers
- **Corner Style:** 1.25rem for `ui-card` and month tiles; 1.75rem for History / breakdown envelopes and hero wells.
- **Background:** White Envelope on the wash. Capture sheets and field fills use Lavender Tissue.
- **Shadow Strategy:** Envelope shadow at rest; hero well uses the deeper hero shadow.
- **Border:** `ui-card` keeps a mixed lavender hairline; Home list envelopes rely on shadow without a hard stroke.
- **Internal Padding:** 1rem typical; login card 1.5rem.

### Inputs / Fields
- **Style:** Lavender Tissue fill, lavender hairline, 1.15rem corners, 0.75rem 1rem, 0.875rem body ink. Opening and confirm amount fields sit inside an envelope or hero well with a transparent native control — the container is the field.
- **Focus:** Border mixes toward Periwinkle, fill goes white, 4px `brand-soft` halo, plus the focus-visible ring. Opening envelopes use a 2px Periwinkle/35 ring.
- **Error / Disabled:** Error sits in a Coral-soft / Burnt Error banner, not an inline red border. Disabled fields dim; OTP uses Geist Mono 1.5rem, 0.35em tracking, centered.

### Navigation
- **Style:** Transparent dock over the wash. Домой and Месяц are stacked icon + 10px label. Active icon well is a 0.9rem squircle in deep plum (`#2a2348`) with a 320ms settle animation; inactive is Body Ink. Labels do not uppercase.
- **Capture cluster:** White pill, 0.375rem padding, dock shadow, overlapping the bar (`-mt-7`). Side 2.75rem circles in pale lilac; center 3.5rem Ink Night mic.
- **Mobile treatment:** This is the default. Desktop keeps the same dock inside the framed phone.
- **In-flow back:** `ui-back` — 0.75rem semibold Periwinkle with a 14px arrow.

### Remainder (signature)
Centered caption «Остаток», display figure, 13px start-line, quiet text button «Изменить старт». No card around the figure — the number sits directly on watercolor. Empty state is the same structure with headline «Задать старт» instead of a fake 0,00.

### Monthly hero (signature)
Ink Night 1.75rem well, Periwinkle blur orb, dusk captions, display net, then a frosted 2-up of income/expense. Month tab may add two rounded-top bars (mint and peach) before the tiles. Status pill in the corner: «пусто» / «плюс» / «минус».

## Do's and Don'ts

### Do:
- **Do** keep Remainder as ink on watercolor, not inside a white card.
- **Do** fill primary commit actions and the mic with Ink Night (`brand-deep`).
- **Do** set money in Manrope 700 tabular-nums with tight tracking.
- **Do** use Periwinkle for kickers, focus, selected chips, and back links.
- **Do** place new list content in a white 1.75rem envelope with the envelope shadow.
- **Do** keep desktop as a framed 32rem phone on Lilac Mist.

### Don't:
- **Don't** fill the primary CTA with Periwinkle.
- **Don't** import the look-reference’s AI chat, GBP, “Money AI”, or assistant orb as product UI.
- **Don't** introduce a wide dashboard, sidebar, or multi-column desktop shell.
- **Don't** use sharp 4–8px radii or charcoal hairlines as the card language.
- **Don't** render Remainder as 0,00 before Set Opening — absence is empty, not zero.
- **Don't** set UI copy in English on product surfaces; the interface is Russian.
- **Don't** use Geist Mono outside the OTP field.
