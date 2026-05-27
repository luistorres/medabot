// SourceBadge — provenance badge shown in chat headers and medicine panels.
// Communicates that answers come from the official patient leaflet.
// Never names the regulatory body in visible text (per README §7.3).

import { Icon } from "./Icon";

interface SourceBadgeProps {
  medicine?: string;
}

export function SourceBadge({ medicine }: SourceBadgeProps) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-surface border border-border rounded text-[11px] text-ink-2">
      <Icon.check className="w-2.5 h-2.5 text-brand" />
      <span>Folheto oficial{medicine ? ` · ${medicine}` : ""}</span>
    </span>
  );
}
