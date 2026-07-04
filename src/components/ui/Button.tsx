"use client";

import { forwardRef } from "react";
import Spinner from "./Spinner";

type Variant = "primary" | "dark" | "ghost" | "outline" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANT: Record<Variant, string> = {
  primary:
    "bg-[color:var(--color-primary)] hover:bg-[color:var(--color-primary-600)] text-white",
  dark: "bg-[color:var(--color-ink)] hover:bg-black text-white",
  ghost:
    "text-[color:var(--color-ink)] hover:bg-black/5",
  outline:
    "border border-black/10 hover:border-black/25 text-[color:var(--color-ink)] bg-white",
  danger:
    "border border-red-200 text-red-700 hover:bg-red-50 bg-white",
};

const SIZE: Record<Size, string> = {
  sm: "text-xs px-3 py-2 rounded-lg",
  md: "text-sm px-4 py-2.5 rounded-xl",
  lg: "text-sm px-5 py-3.5 rounded-xl",
};

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    loading = false,
    fullWidth = false,
    className = "",
    children,
    disabled,
    ...rest
  },
  ref,
) {
  const isDisabled = disabled || loading;
  return (
    <button
      ref={ref}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={`relative inline-flex items-center justify-center gap-2 font-semibold transition-[opacity,background-color] duration-150 ${
        VARIANT[variant]
      } ${SIZE[size]} ${fullWidth ? "w-full" : ""} ${
        isDisabled ? "opacity-60 cursor-not-allowed" : ""
      } ${className}`}
      {...rest}
    >
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <Spinner size="sm" />
        </span>
      )}
      <span
        className={`inline-flex items-center gap-2 ${loading ? "invisible" : ""}`}
      >
        {children}
      </span>
    </button>
  );
});

export default Button;
