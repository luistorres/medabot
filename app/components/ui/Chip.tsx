import { ButtonHTMLAttributes, forwardRef } from "react";

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

const Chip = forwardRef<HTMLButtonElement, ChipProps>(
  ({ active, className = "", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`
          inline-flex items-center
          min-h-[44px] px-4 py-2
          rounded-full text-sm font-medium
          transition-all duration-150
          ${
            active
              ? "bg-primary-100 text-primary-700 border border-primary-300"
              : "bg-surface-secondary hover:bg-surface-tertiary text-primary-800 border border-surface-tertiary"
          }
          active:scale-95
          ${className}
        `}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Chip.displayName = "Chip";

export default Chip;
