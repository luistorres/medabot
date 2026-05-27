// Mark — the folded-leaflet-with-face SVG mark.
// Ported from design_handoff_apothecary/prototype/marks.jsx (MarkLeaflet / Mark).
// Used for app icons, splash screen, loading state — NOT inline with the wordmark
// (the Wordmark component uses a CSS dot anchor instead).

interface MarkProps {
  size?: number;
  color?: string;
  accent?: string;
  paper?: string;
}

export function Mark({
  size = 22,
  color = "currentColor",
  accent = "#B07A1F",
  paper = "#FFFFFF",
}: MarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      style={{ display: "inline-block", flexShrink: 0 }}
      aria-hidden="true"
    >
      <g transform="rotate(-2, 50, 50)">
        <rect
          x="22"
          y="18"
          width="56"
          height="64"
          rx="3"
          fill={paper}
          stroke={color}
          strokeWidth="2.6"
        />
        {/* Fold — dashed horizontal line */}
        <line
          x1="22"
          y1="50"
          x2="78"
          y2="50"
          stroke={color}
          strokeWidth="1.4"
          strokeDasharray="2.5 2.5"
          opacity="0.5"
        />
        {/* Text lines above fold */}
        <line
          x1="30"
          y1="28"
          x2="62"
          y2="28"
          stroke={accent}
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <line
          x1="30"
          y1="34.5"
          x2="56"
          y2="34.5"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.55"
        />
        <line
          x1="30"
          y1="41"
          x2="66"
          y2="41"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.55"
        />
        {/* Eyes below fold */}
        <circle cx="40" cy="62" r="2.6" fill={color} />
        <circle cx="60" cy="62" r="2.6" fill={color} />
        {/* Smile */}
        <path
          d="M41 72 Q50 76.5 59 72"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}
