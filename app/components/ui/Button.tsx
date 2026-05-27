import { ButtonHTMLAttributes, forwardRef } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "link";
type ButtonSize = "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

const base =
  "inline-flex items-center justify-center gap-2 font-medium text-sm tracking-[-0.005em] rounded-lg border border-transparent transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none";

const sizes: Record<ButtonSize, string> = {
  md: "min-h-[48px] px-[18px] py-3",
  sm: "min-h-[44px] px-[14px] py-2 text-[13px]",
};

const variants: Record<ButtonVariant, string> = {
  primary: "bg-brand text-white hover:bg-brand-deep",
  secondary: "bg-paper text-ink border-border hover:bg-tint",
  ghost: "bg-transparent text-ink-2 hover:bg-tint",
  link: "bg-transparent text-brand underline underline-offset-4 decoration-faint hover:decoration-brand p-0 min-h-0 border-0",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      fullWidth,
      className = "",
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const sizeClasses = variant === "link" ? "" : sizes[size];
    const composed =
      base +
      (sizeClasses ? " " + sizeClasses : "") +
      " " +
      variants[variant] +
      (fullWidth ? " w-full" : "") +
      (className ? " " + className : "");

    return (
      <button ref={ref} className={composed} disabled={disabled} {...props}>
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export default Button;
