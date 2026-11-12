import { cn } from "@/lib/cn";

/** Aman Academy mark: a shield holding an open page, with an emerald check. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={cn("size-9", className)} aria-hidden="true" focusable="false">
      <path d="M20 3 5.5 8.2v10.3c0 8.7 5.8 15.2 14.5 18.5 8.700-3.3 14.5-9.8 14.500-18.500V8.200L20 3Z" fill="#0a1c36" />
      <path d="M20 6.200 8.500 10.300v8.200c0 6.900 4.500 12.200 11.500 15.200 7-3 11.500-8.300 11.500-15.200v-8.200L20 6.200Z" fill="none" stroke="#fff" strokeOpacity=".16" />
      <path d="m13.200 19.800 4.700 4.700 9-9.600" fill="none" stroke="#13996f" strokeWidth="3.200" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ brand, tone = "dark", className }: { brand: string; tone?: "dark" | "light"; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className={cn("font-display text-lg font-semibold leading-none", tone === "dark" ? "text-navy-900" : "text-white")}>{brand}</span>
    </span>
  );
}
