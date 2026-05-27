import { ButtonHTMLAttributes, forwardRef } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  fullWidth?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-primary-600 hover:bg-primary-700 text-white shadow-sm shadow-primary-800/15 active:bg-primary-800",
  secondary:
    "bg-surface hover:bg-surface-secondary text-primary-900 border border-surface-tertiary shadow-sm active:bg-surface-tertiary",
  ghost:
    "bg-transparent hover:bg-surface-secondary text-primary-800 active:bg-surface-tertiary",
  danger:
    "bg-error-600 hover:bg-error-700 text-white shadow-sm shadow-error-800/15 active:bg-error-700",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", fullWidth, className = "", children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`
          inline-flex items-center justify-center gap-2
          min-h-[44px] px-5 py-2.5
          rounded-xl text-sm font-medium
          transition-colors duration-150
          disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none
          ${variantClasses[variant]}
          ${fullWidth ? "w-full" : ""}
          ${className}
        `}
        disabled={disabled}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export default Button;
