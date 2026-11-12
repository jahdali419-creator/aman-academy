import { Car, Flame, HeartPulse, ShieldCheck, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

const icons: Record<string, LucideIcon> = { heart: HeartPulse, flame: Flame, car: Car, shield: ShieldCheck };
export const courseIconNames = Object.keys(icons);

export function CourseIcon({ name, className, size = "md" }: { name: string; className?: string; size?: "sm" | "md" | "lg" }) {
  const Icon = icons[name] ?? ShieldCheck;
  const box = size === "lg" ? "size-16 rounded-2xl" : size === "sm" ? "size-10 rounded-xl" : "size-12 rounded-xl";
  const glyph = size === "lg" ? "size-8" : size === "sm" ? "size-5" : "size-6";
  return (
    <span aria-hidden className={cn("grid shrink-0 place-items-center bg-navy-900 text-emerald-300 shadow-soft", box, className)}>
      <Icon className={glyph} strokeWidth={1.75} />
    </span>
  );
}
