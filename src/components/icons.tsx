/** Inline SVG icons — no emoji. */

type IconProps = { className?: string; size?: number };

export function IconMic({ className, size = 24 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

export function IconCamera({ className, size = 22 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

export function IconPen({ className, size = 22 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}

export function IconHome({ className, size = 22 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" />
    </svg>
  );
}

export function IconChart({ className, size = 22 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

export function IconTags({ className, size = 20 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  );
}

export function IconArrowLeft({ className, size = 16 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

/** Income inflow affordance (arrow down-left into wallet). */
export function IconArrowDownLeft({ className, size = 18 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <line x1="17" y1="7" x2="7" y2="17" />
      <polyline points="17 17 7 17 7 7" />
    </svg>
  );
}

/** Expense outflow affordance (arrow up-right out of wallet). */
export function IconArrowUpRight({ className, size = 18 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <line x1="7" y1="17" x2="17" y2="7" />
      <polyline points="7 7 17 7 17 17" />
    </svg>
  );
}

/** Modern two-layer icon set reserved for the persistent PWA dock. */
export function IconNavHome({ className, size = 20 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path
        d="M4 10.6 12 4l8 6.6v7.15A2.25 2.25 0 0 1 17.75 20h-11.5A2.25 2.25 0 0 1 4 17.75V10.6Z"
        fill="currentColor"
        fillOpacity="0.14"
      />
      <path d="M4 10.6 12 4l8 6.6v7.15A2.25 2.25 0 0 1 17.75 20h-11.5A2.25 2.25 0 0 1 4 17.75V10.6Z" />
      <path d="M9.25 20v-5.25h5.5V20" />
    </svg>
  );
}

export function IconNavAnalytics({ className, size = 20 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <rect
        x="3.5"
        y="4"
        width="17"
        height="16"
        rx="3.2"
        fill="currentColor"
        fillOpacity="0.12"
      />
      <rect x="3.5" y="4" width="17" height="16" rx="3.2" />
      <path d="M7.5 15.8V12" />
      <path d="M12 15.8V8.4" />
      <path d="M16.5 15.8v-4.9" />
    </svg>
  );
}

export function IconNavCamera({ className, size = 21 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path
        d="M4.4 7.8h3.4l1.1-2h6.2l1.1 2h3.4a1.9 1.9 0 0 1 1.9 1.9v7.9a1.9 1.9 0 0 1-1.9 1.9H4.4a1.9 1.9 0 0 1-1.9-1.9V9.7a1.9 1.9 0 0 1 1.9-1.9Z"
        fill="currentColor"
        fillOpacity="0.13"
      />
      <path d="M4.4 7.8h3.4l1.1-2h6.2l1.1 2h3.4a1.9 1.9 0 0 1 1.9 1.9v7.9a1.9 1.9 0 0 1-1.9 1.9H4.4a1.9 1.9 0 0 1-1.9-1.9V9.7a1.9 1.9 0 0 1 1.9-1.9Z" />
      <circle cx="12" cy="13.5" r="3.2" />
    </svg>
  );
}

export function IconNavMic({ className, size = 25 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <rect
        x="8.25"
        y="2.5"
        width="7.5"
        height="12"
        rx="3.75"
        fill="currentColor"
        fillOpacity="0.18"
      />
      <rect x="8.25" y="2.5" width="7.5" height="12" rx="3.75" />
      <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0" />
      <path d="M12 18v3" />
      <path d="M8.75 21h6.5" />
    </svg>
  );
}

export function IconNavCompose({ className, size = 21 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path
        d="m13.3 5.1 5.6 5.6-8.6 8.6-5.1 1.1 1.1-5.1 8.6-8.6a1.15 1.15 0 0 1 1.6 0l1.4 1.4a1.15 1.15 0 0 1 0 1.6l-1.1 1.1"
        fill="currentColor"
        fillOpacity="0.12"
      />
      <path d="m13.3 5.1 5.6 5.6-8.6 8.6-5.1 1.1 1.1-5.1 8.6-8.6a1.15 1.15 0 0 1 1.6 0l1.4 1.4a1.15 1.15 0 0 1 0 1.6l-1.1 1.1" />
      <path d="m12.2 6.2 5.6 5.6" />
    </svg>
  );
}
