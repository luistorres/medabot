// Icon map — outline SVGs ported from design_handoff_apothecary/prototype/shared.jsx
// All icons: stroke="currentColor", strokeWidth=1.5 (exceptions: check=2, chevron=1.75, dot uses fill)
// Size/color come from consumer className (e.g. "w-5 h-5 text-brand")

type SVGProps = React.SVGProps<SVGSVGElement>;

export const Icon = {
  camera: (props: SVGProps) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 8.5a2 2 0 0 1 2-2h2l1.5-2h7l1.5 2h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-9Z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  ),

  search: (props: SVGProps) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  ),

  arrow: (props: SVGProps) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  ),

  back: (props: SVGProps) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </svg>
  ),

  send: (props: SVGProps) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M5 12 4 4l16 8-16 8 1-8Z" />
      <path d="M5 12h8" />
    </svg>
  ),

  doc: (props: SVGProps) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
      <path d="M14 3v5h5" />
    </svg>
  ),

  download: (props: SVGProps) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 4v12M7 11l5 5 5-5" />
      <path d="M5 20h14" />
    </svg>
  ),

  refresh: (props: SVGProps) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 12a8 8 0 0 1 13.7-5.6L20 9" />
      <path d="M20 4v5h-5" />
      <path d="M20 12a8 8 0 0 1-13.7 5.6L4 15" />
      <path d="M4 20v-5h5" />
    </svg>
  ),

  close: (props: SVGProps) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  ),

  // Domain icons — visually distinct, no duplicates
  molecule: (props: SVGProps) => (  // active substance
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="6" cy="6" r="2.5" />
      <circle cx="18" cy="6" r="2.5" />
      <circle cx="12" cy="18" r="2.5" />
      <path d="M8 7.5 11 16M16 7.5 13 16M8.5 6h7" />
    </svg>
  ),

  scale: (props: SVGProps) => (  // dosage
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 4v16M5 8h14" />
      <path d="M3 14c0-3 2-6 2-6s2 3 2 6H3ZM17 14c0-3 2-6 2-6s2 3 2 6h-4Z" />
      <path d="M9 20h6" />
    </svg>
  ),

  pill: (props: SVGProps) => (  // pharmaceutical form
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="3" y="9" width="18" height="6" rx="3" />
      <path d="M12 9v6" />
    </svg>
  ),

  building: (props: SVGProps) => (  // marketing authorization holder
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 20V6a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v14" />
      <path d="M15 10h4a1 1 0 0 1 1 1v9" />
      <path d="M8 9h3M8 13h3M8 17h3" />
      <path d="M3 20h18" />
    </svg>
  ),

  // Tab nav
  chat: (props: SVGProps) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1h-8l-4 3v-3H5a1 1 0 0 1-1-1V5Z" />
    </svg>
  ),

  info: (props: SVGProps) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8h.01M11 12h1v4h1" />
    </svg>
  ),

  page: (props: SVGProps) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M6 3h9l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
      <path d="M14 3v5h5M8 12h8M8 16h6" />
    </svg>
  ),

  check: (props: SVGProps) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m4 12 5 5L20 6" />
    </svg>
  ),

  chevron: (props: SVGProps) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m9 6 6 6-6 6" />
    </svg>
  ),

  dot: (props: SVGProps) => (
    <svg width="6" height="6" viewBox="0 0 6 6" {...props}>
      <circle cx="3" cy="3" r="3" fill="currentColor" />
    </svg>
  ),
} as const;

export type IconName = keyof typeof Icon;
