import type { ComponentProps, ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { cn } from "@/lib/cn";

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div {...props} className={cn("rounded-2xl border border-line bg-white shadow-soft", className)} />;
}

export type Tone = "neutral" | "success" | "info" | "warning" | "danger" | "navy";
const toneClass: Record<Tone, string> = {
  neutral: "bg-paper-2 text-navy-800 border-line",
  success: "bg-emerald-50 text-emerald-700 border-emerald-100",
  info: "bg-navy-50 text-navy-700 border-navy-100",
  warning: "bg-amber-50 text-amber-700 border-amber-100",
  danger: "bg-red-50 text-red-700 border-red-100",
  navy: "bg-navy-900 text-white border-navy-900",
};

export function Badge({ tone = "neutral", className, ...props }: { tone?: Tone } & ComponentProps<"span">) {
  return (
    <span
      {...props}
      className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold leading-5", toneClass[tone], className)}
    />
  );
}

const alertIcon = { success: CheckCircle2, info: Info, warning: AlertTriangle, danger: XCircle, neutral: Info, navy: Info };

export function Alert({
  tone = "info",
  title,
  children,
  className,
  role,
}: {
  tone?: Tone;
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
  role?: "alert" | "status" | "note";
}) {
  const Icon = alertIcon[tone];
  return (
    <div role={role ?? (tone === "danger" ? "alert" : "note")} className={cn("flex gap-3 rounded-xl border p-4 text-sm", toneClass[tone], className)}>
      <Icon aria-hidden className="mt-0.5 size-5 shrink-0" />
      <div className="min-w-0 space-y-1">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className="leading-relaxed">{children}</div> : null}
      </div>
    </div>
  );
}

export function EmptyState({ icon, title, children, action }: { icon?: ReactNode; title: ReactNode; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-line-strong bg-white/60 px-6 py-12 text-center">
      {icon ? <div className="mb-4 grid size-12 place-items-center rounded-full bg-paper-2 text-navy-700">{icon}</div> : null}
      <h3 className="text-lg font-semibold text-navy-900">{title}</h3>
      {children ? <p className="mt-2 max-w-md text-sm text-muted">{children}</p> : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

/**
 * Left-to-right island for emails, phone numbers, codes and URLs, so they
 * render correctly inside Arabic text.
 */
export function Ltr({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <bdi dir="ltr" className={cn("inline-block", className)}>
      {children}
    </bdi>
  );
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("text-sm font-semibold tracking-wide text-emerald-600", className)}>{children}</p>;
}

export function SectionHeading({ eyebrow, title, lead, align = "start" }: { eyebrow?: ReactNode; title: ReactNode; lead?: ReactNode; align?: "start" | "center" }) {
  return (
    <div className={cn("max-w-2xl", align === "center" && "mx-auto text-center")}>
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      <h2 className="mt-2 text-3xl font-semibold leading-tight text-navy-900 sm:text-4xl">{title}</h2>
      {lead ? <p className="mt-4 text-lg leading-relaxed text-muted">{lead}</p> : null}
    </div>
  );
}

export function PageHeader({ title, lead, actions, eyebrow }: { title: ReactNode; lead?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
        <h1 className="mt-1 text-2xl font-semibold text-navy-900 sm:text-3xl">{title}</h1>
        {lead ? <p className="mt-2 max-w-2xl text-muted">{lead}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function Stat({ label, value, hint }: { label: ReactNode; value: ReactNode; hint?: ReactNode }) {
  return (
    <Card className="p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 font-display text-3xl font-semibold text-navy-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </Card>
  );
}

/** Responsive table: scrolls horizontally on small screens. */
export function DataTable({ head, children, caption }: { head: ReactNode[]; children: ReactNode; caption: string }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-white shadow-soft">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-line bg-paper text-start text-xs font-semibold text-muted">
            {head.map((h, i) => (
              <th key={i} scope="col" className="px-4 py-3 text-start font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="[&>tr]:border-b [&>tr]:border-line [&>tr:last-child]:border-0 [&_td]:px-4 [&_td]:py-3 [&_td]:align-top">{children}</tbody>
      </table>
    </div>
  );
}

export function DefinitionRow({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-3 sm:flex-row sm:items-baseline sm:gap-6">
      <dt className="w-44 shrink-0 text-sm text-muted">{label}</dt>
      <dd className="min-w-0 font-medium text-navy-900">{children}</dd>
    </div>
  );
}
