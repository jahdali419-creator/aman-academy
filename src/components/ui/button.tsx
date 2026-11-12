import type { ComponentProps } from "react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "light" | "outline-light" | "danger";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all duration-200 select-none whitespace-nowrap " +
  "disabled:opacity-55 disabled:pointer-events-none aria-disabled:opacity-55 aria-disabled:pointer-events-none active:scale-[0.98]";

const variants: Record<Variant, string> = {
  primary: "bg-emerald-600 text-white shadow-soft hover:bg-emerald-700",
  secondary: "bg-navy-900 text-white shadow-soft hover:bg-navy-800",
  ghost: "text-navy-800 hover:bg-navy-50",
  light: "bg-white text-navy-900 border border-line hover:border-line-strong hover:bg-paper",
  "outline-light": "border border-white/30 text-white hover:bg-white/10",
  danger: "bg-red-700 text-white hover:bg-red-700/90",
};
const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-5 text-[0.95rem]",
  lg: "h-13 px-7 text-base",
};

export const buttonClass = (variant: Variant = "primary", size: Size = "md", className?: string) =>
  cn(base, variants[variant], sizes[size], className);

type Common = { variant?: Variant; size?: Size };

export function Button({ variant, size, className, ...props }: Common & ComponentProps<"button">) {
  return <button {...props} className={buttonClass(variant, size, className)} />;
}

export function ButtonLink({ variant, size, className, ...props }: Common & ComponentProps<typeof Link>) {
  return <Link {...props} className={buttonClass(variant, size, className)} />;
}
