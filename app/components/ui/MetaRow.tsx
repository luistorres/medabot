// MetaRow — replaces the chip wall on the medicine info panel.
// Key-value rows: label in uppercase eyebrow, value in serif (for important fields)
// or sans. Per README §7.7 — do NOT put each item in a colored chip with an icon.

interface MetaItem {
  label: string;
  value: string;
  serif?: boolean;
}

interface MetaRowProps {
  items: MetaItem[];
}

export function MetaRow({ items }: MetaRowProps) {
  return (
    <div className="flex flex-col gap-2.5">
      {items.map((it) => (
        <div key={it.label} className="flex items-baseline gap-3">
          <span className="text-[11px] uppercase tracking-wider text-muted w-[90px] flex-shrink-0">
            {it.label}
          </span>
          <span
            className={`${it.serif ? "font-serif text-[17px]" : "text-[14px]"} text-ink`}
          >
            {it.value}
          </span>
        </div>
      ))}
    </div>
  );
}
