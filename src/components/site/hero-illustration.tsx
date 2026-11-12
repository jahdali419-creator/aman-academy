import { BadgeCheck, Mic, QrCode, Video } from "lucide-react";
import { LogoMark } from "./logo";

type Labels = { live: string; session: string; instructor: string; you: string; exam: string; certificate: string; verify: string; note: string };

/**
 * Decorative product illustration (not a photograph): a live online class,
 * the exam result and the certificate. It deliberately shows a screen-based
 * class so it never implies hands-on practice.
 */
export function HeroIllustration({ labels }: { labels: Labels }) {
  const tile = (initials: string, tone: string, label?: string) => (
    <div className={`relative grid aspect-[4/3] place-items-center rounded-xl ${tone}`}>
      <span className="grid size-11 place-items-center rounded-full bg-white/15 font-display text-sm font-semibold text-white">{initials}</span>
      {label ? <span className="absolute bottom-1.5 start-2 rounded-md bg-navy-950/60 px-1.5 py-0.5 text-[10px] font-medium text-white">{label}</span> : null}
    </div>
  );
  return (
    <div aria-hidden className="relative mx-auto w-full max-w-md select-none lg:max-w-none">
      <div className="animate-rise rounded-3xl border border-white/10 bg-navy-800/80 p-3 shadow-lift backdrop-blur [animation-delay:150ms]">
        <div className="flex items-center justify-between px-2 pb-3 pt-1">
          <span className="text-xs font-medium text-navy-100">{labels.session}</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-300">
            <span className="size-1.5 rounded-full bg-emerald-300 animate-pulse-dot" />
            {labels.live}
          </span>
        </div>
        <div className="relative grid aspect-[16/9] place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-navy-700 to-navy-900">
          <div className="absolute inset-0 opacity-40 [background:radial-gradient(24rem_12rem_at_70%_0%,rgb(19_153_111/.5),transparent_70%)]" />
          <div className="relative flex flex-col items-center gap-3">
            <span className="grid size-20 place-items-center rounded-full bg-white/10 ring-1 ring-white/20">
              <LogoMark className="size-11" />
            </span>
            <span className="rounded-md bg-navy-950/60 px-2 py-0.5 text-[11px] font-medium text-white">{labels.instructor}</span>
          </div>
          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-2">
            <span className="grid size-8 place-items-center rounded-full bg-white/10 text-white"><Mic className="size-4" /></span>
            <span className="grid size-8 place-items-center rounded-full bg-white/10 text-white"><Video className="size-4" /></span>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {tile("ن", "bg-navy-700", labels.you)}
          {tile("F", "bg-navy-600/70")}
          {tile("م", "bg-navy-700/70")}
          {tile("R", "bg-navy-600/50")}
        </div>
      </div>

      <div className="absolute -top-11 end-2 animate-float rounded-2xl border border-line bg-white px-4 py-3 shadow-lift sm:-end-4">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-full bg-emerald-50 text-emerald-600"><BadgeCheck className="size-5" /></span>
          <div>
            <p className="text-xs font-semibold text-navy-900">{labels.exam}</p>
            <p className="font-display text-sm font-semibold text-emerald-600">90%</p>
          </div>
        </div>
      </div>

      <div className="absolute -bottom-8 start-2 w-52 animate-float rounded-2xl border border-line bg-paper p-4 shadow-lift [animation-delay:1.5s] sm:-start-6">
        <div className="flex items-center justify-between">
          <LogoMark className="size-6" />
          <span className="text-[10px] font-semibold tracking-wide text-muted">{labels.certificate}</span>
        </div>
        <div className="mt-3 space-y-1.5">
          <div className="h-2 w-28 rounded-full bg-navy-900/80" />
          <div className="h-1.5 w-36 rounded-full bg-line-strong" />
          <div className="h-1.5 w-24 rounded-full bg-line-strong" />
        </div>
        <div className="mt-3 flex items-end justify-between">
          <span className="text-[10px] text-muted">{labels.verify}</span>
          <QrCode className="size-9 text-navy-900" strokeWidth={1.5} />
        </div>
      </div>
    </div>
  );
}
