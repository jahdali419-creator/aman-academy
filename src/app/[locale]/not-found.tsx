import { getTranslations } from "next-intl/server";
import { Compass } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";

export default async function NotFound() {
  const t = await getTranslations("common");
  return (
    <div className="container-page grid min-h-[60vh] place-items-center py-20 text-center">
      <div>
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-paper-2 text-navy-700"><Compass aria-hidden className="size-8" /></span>
        <p className="mt-6 font-display text-sm font-semibold text-emerald-600">404</p>
        <h1 className="mt-2 text-3xl font-semibold text-navy-900 sm:text-4xl">{t("notFound.title")}</h1>
        <p className="mx-auto mt-3 max-w-md text-muted">{t("notFound.body")}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/">{t("actions.goHome")}</ButtonLink>
          <ButtonLink href="/courses" variant="light">{t("actions.exploreCourses")}</ButtonLink>
        </div>
      </div>
    </div>
  );
}
