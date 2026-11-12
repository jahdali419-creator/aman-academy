import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { Check } from "lucide-react";

/** Two-column frame for sign-in and registration pages. */
export async function AuthShell({ title, lead, children, footer, wide }: { title: string; lead?: string; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  const [tc, th] = await Promise.all([getTranslations("common"), getTranslations("home.hero")]);
  const points = th.raw("points") as string[];
  return (
    <div className="container-page grid gap-10 py-12 sm:py-16 lg:grid-cols-[1fr_24rem] lg:items-start">
      <div className={wide ? "mx-auto w-full max-w-2xl lg:mx-0" : "mx-auto w-full max-w-xl lg:mx-0"}>
        <h1 className="text-3xl font-semibold text-navy-900 sm:text-4xl">{title}</h1>
        {lead ? <p className="mt-3 text-lg text-muted">{lead}</p> : null}
        <div className="mt-8 rounded-3xl border border-line bg-white p-6 shadow-soft sm:p-8">{children}</div>
        {footer ? <div className="mt-6 text-sm text-muted">{footer}</div> : null}
      </div>
      <aside className="hidden rounded-3xl bg-navy-900 bg-weave p-8 text-white shadow-lift lg:block">
        <p className="font-display text-2xl font-semibold leading-snug">{tc("tagline")}</p>
        <ul className="mt-8 space-y-4 text-navy-100">
          {points.map((p) => (
            <li key={p} className="flex gap-3">
              <Check aria-hidden className="mt-1 size-4.5 shrink-0 text-emerald-300" />
              {p}
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
