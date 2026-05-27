import { ButtonHTMLAttributes, forwardRef } from "react";

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

const base =
  "inline-flex items-center gap-1.5 min-h-[40px] px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150";

const activeClasses = "bg-brand-soft text-brand-ink border border-brand/20";
const inactiveClasses = "bg-tint text-ink-2 border border-border hover:bg-paper";

const Chip = forwardRef<HTMLButtonElement, ChipProps>(
  ({ active, className = "", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`${base} ${active ? activeClasses : inactiveClasses}${className ? " " + className : ""}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Chip.displayName = "Chip";

export default Chip;
