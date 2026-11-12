"use client";

import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Globe } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

/** Switches language while keeping the visitor on the same page (and query). */
export function LocaleSwitch({ tone = "dark", className }: { tone?: "dark" | "light"; className?: string }) {
  const locale = useLocale();
  const t = useTranslations("common.language");
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const other = locale === "ar" ? "en" : "ar";
  return (
    <Link
      href={search ? `${pathname}?${search}` : pathname}
      locale={other}
      lang={other}
      dir={other === "ar" ? "rtl" : "ltr"}
      aria-label={t("switchAria")}
      className={cn(
        "inline-flex h-10 items-center gap-2 rounded-full border px-3.5 text-sm font-semibold transition-colors",
        tone === "dark" ? "border-line-strong bg-white text-navy-900 hover:bg-paper-2" : "border-white/25 text-white hover:bg-white/10",
        className,
      )}
    >
      <Globe aria-hidden className="size-4" />
      <span>{t("switchTo")}</span>
    </Link>
  );
}
