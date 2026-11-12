"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Building2, GraduationCap, Presentation, Settings2 } from "lucide-react";
import { demoSignInAction } from "@/server/actions/auth";
import { useErrorText } from "@/components/ui/form";

const personas = [
  ["learner", GraduationCap],
  ["manager", Building2],
  ["instructor", Presentation],
  ["admin", Settings2],
] as const;

/**
 * One-click sign-in to the seeded fictional accounts. Rendered only when the
 * server runs with DEMO_MODE=true; the server action refuses otherwise.
 */
export function DemoAccess({ next }: { next?: string }) {
  const t = useTranslations("auth.demo");
  const [state, action, pending] = useActionState(demoSignInAction, null);
  const errorText = useErrorText();
  return (
    <section aria-labelledby="demo-h" className="mt-8 rounded-3xl border border-dashed border-emerald-600/40 bg-emerald-50/60 p-6">
      <h2 id="demo-h" className="text-lg font-semibold text-navy-900">{t("title")}</h2>
      <p className="mt-1 text-sm text-muted">{t("lead")}</p>
      {state && !state.ok ? <p role="alert" className="mt-3 text-sm font-medium text-red-700">{errorText(state.error)}</p> : null}
      <form action={action} className="mt-5 grid gap-3 sm:grid-cols-2">
        {next ? <input type="hidden" name="next" value={next} /> : null}
        {personas.map(([key, Icon]) => (
          <button
            key={key}
            type="submit"
            name="persona"
            value={key}
            disabled={pending}
            className="flex items-center gap-3 rounded-2xl border border-line bg-white p-4 text-start shadow-soft transition-all hover:-translate-y-0.5 hover:border-emerald-600/50 hover:shadow-lift disabled:opacity-60"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-navy-900 text-emerald-300"><Icon aria-hidden className="size-5" /></span>
            <span className="min-w-0">
              <span className="block font-semibold text-navy-900">{t(key)}</span>
              <span className="block text-xs text-muted">{t(`${key}Hint`)}</span>
            </span>
          </button>
        ))}
      </form>
    </section>
  );
}
