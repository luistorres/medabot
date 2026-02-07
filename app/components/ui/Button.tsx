import { ButtonHTMLAttributes, forwardRef } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  fullWidth?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-primary-600 hover:bg-primary-700 text-white shadow-sm active:bg-primary-800",
  secondary:
    "bg-white hover:bg-gray-50 text-gray-800 border border-gray-200 shadow-sm active:bg-gray-100",
  ghost:
    "bg-transparent hover:bg-gray-100 text-gray-700 active:bg-gray-200",
  danger:
    "bg-error-600 hover:bg-error-700 text-white shadow-sm active:bg-error-700",
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
