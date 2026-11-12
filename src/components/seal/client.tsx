"use client";

import { useEffect, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

/**
 * Motion and menu behaviour for The Seal design:
 *  - reveals [data-reveal] elements as they enter the viewport;
 *  - writes scroll position to --sy and progress (0..1) to --p on [data-progress];
 *  - pulls [data-magnetic] buttons towards a fine pointer;
 *  - opens and closes the small-screen menu ([data-menu-btn] toggles data-menu on <html>).
 * Re-runs on every navigation. Motion is skipped when the visitor prefers reduced motion.
 */
export function SealRuntime() {
  const pathname = usePathname();
  useEffect(() => {
    const root = document.documentElement;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    root.dataset.motion = reduced ? "reduced" : "on";

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.setAttribute("data-in", "");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.08 },
    );
    document.querySelectorAll("[data-reveal]").forEach((el) => io.observe(el));

    let raf = 0;
    const tracked = Array.from(document.querySelectorAll<HTMLElement>("[data-progress]"));
    const measure = () => {
      raf = 0;
      const vh = window.innerHeight;
      root.style.setProperty("--sy", String(window.scrollY));
      root.toggleAttribute("data-scrolled", window.scrollY > 24);
      for (const el of tracked) {
        const r = el.getBoundingClientRect();
        el.style.setProperty("--p", Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height))).toFixed(4));
      }
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
    const onMove = (ev: PointerEvent) => {
      const el = (ev.target as HTMLElement).closest<HTMLElement>("[data-magnetic]");
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${((ev.clientX - r.left - r.width / 2) * 0.22).toFixed(1)}px`);
      el.style.setProperty("--my", `${((ev.clientY - r.top - r.height / 2) * 0.3).toFixed(1)}px`);
    };
    const onLeave = (ev: PointerEvent) => {
      const el = (ev.target as HTMLElement).closest?.<HTMLElement>("[data-magnetic]");
      if (el) {
        el.style.setProperty("--mx", "0px");
        el.style.setProperty("--my", "0px");
      }
    };
    if (fine && !reduced) {
      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerout", onLeave);
    }

    const setMenu = (open: boolean) => {
      root.toggleAttribute("data-menu", open);
      document.querySelectorAll("[data-menu-btn]").forEach((b) => b.setAttribute("aria-expanded", String(open)));
    };
    const onClick = (ev: MouseEvent) => {
      const t = ev.target as HTMLElement;
      if (t.closest("[data-menu-btn]")) setMenu(!root.hasAttribute("data-menu"));
      else if (t.closest("[data-menu-panel] a")) setMenu(false);
    };
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape" && root.hasAttribute("data-menu")) {
        setMenu(false);
        document.querySelector<HTMLElement>("[data-menu-btn]")?.focus();
      }
    };
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);

    return () => {
      io.disconnect();
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerout", onLeave);
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
      setMenu(false);
    };
  }, [pathname]);
  return null;
}

/** AR / EN control. Keeps the visitor on the same page (and query) in the other language. */
export function LangPill({ label }: { label: string }) {
  const locale = useLocale();
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const href = search ? `${pathname}?${search}` : pathname;
  return (
    <div className="ca-lang" role="group" aria-label={label}>
      {(["ar", "en"] as const).map((l) => (
        <Link key={l} href={href} locale={l} lang={l} aria-current={l === locale ? "true" : undefined}>
          <span aria-hidden="true">{l.toUpperCase()}</span>
          <span className="sr-only">{l === "ar" ? "العربية" : "English"}</span>
        </Link>
      ))}
    </div>
  );
}

/** Header link that marks itself as the current page. */
export function SealNavLink({ href, children }: { href: string; children: ReactNode }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link href={href} aria-current={active ? "page" : undefined}>
      {children}
    </Link>
  );
}
