"use client";

import { useTranslations } from "next-intl";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("common");
  return (
    <div role="alert" className="container-page grid min-h-[60vh] place-items-center py-20 text-center">
      <div>
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-red-50 text-red-700"><TriangleAlert aria-hidden className="size-8" /></span>
        <h1 className="mt-6 text-3xl font-semibold text-navy-900">{t("error.title")}</h1>
        <p className="mx-auto mt-3 max-w-md text-muted">{t("error.body")}</p>
        <Button onClick={reset} className="mt-8">{t("actions.tryAgain")}</Button>
      </div>
    </div>
  );
}
