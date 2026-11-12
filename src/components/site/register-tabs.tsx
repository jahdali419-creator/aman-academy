import { getTranslations } from "next-intl/server";
import { Building2, UserRound } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

export async function RegisterTabs({ active }: { active: "individual" | "company" }) {
  const t = await getTranslations("auth.register.tabs");
  const tab = (key: "individual" | "company", href: string, Icon: typeof UserRound) => (
    <Link
      href={href}
      aria-current={active === key ? "page" : undefined}
      className={cn(
        "flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors",
        active === key ? "bg-navy-900 text-white shadow-soft" : "text-navy-700 hover:bg-navy-50",
      )}
    >
      <Icon aria-hidden className="size-4" />
      {t(key)}
    </Link>
  );
  return (
    <nav aria-label={t("label")} className="mb-7 flex gap-1 rounded-full border border-line bg-paper p-1">
      {tab("individual", "/register", UserRound)}
      {tab("company", "/register/company", Building2)}
    </nav>
  );
}
