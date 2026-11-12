"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Lang } from "./lang";

/**
 * One small script for all three previews:
 *  - reveals [data-reveal] elements as they enter the viewport;
 *  - writes scroll progress (0..1) to --p on every [data-progress] element;
 *  - pulls [data-magnetic] elements towards a fine pointer;
 *  - opens and closes the mobile menu ([data-menu-btn] toggles data-menu on <html>).
 * Everything is skipped or simplified when the visitor prefers reduced motion.
 */
export function Runtime() {
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
        const p = Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height)));
        el.style.setProperty("--p", p.toFixed(4));
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
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerout", onLeave);
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
      root.removeAttribute("data-menu");
    };
  }, []);
  return null;
}

/** AR / EN control. The choice is stored in a cookie so the server renders the right language and direction. */
export function LangSwitch({ lang, className }: { lang: Lang; className?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const choose = (next: Lang) => {
    if (next === lang) return;
    document.cookie = `aman_preview_lang=${next}; path=/; max-age=31536000; samesite=lax`;
    start(() => router.refresh());
  };
  return (
    <div className={className} role="group" aria-label={lang === "ar" ? "اللغة" : "Language"} data-pending={pending || undefined}>
      <button type="button" lang="ar" aria-pressed={lang === "ar"} onClick={() => choose("ar")}>
        <span aria-hidden="true">AR</span>
        <span className="pv-sr">العربية</span>
      </button>
      <button type="button" lang="en" aria-pressed={lang === "en"} onClick={() => choose("en")}>
        <span aria-hidden="true">EN</span>
        <span className="pv-sr">English</span>
      </button>
    </div>
  );
}

/** Counts the seconds since the page opened (Concept B). */
export function Elapsed({ className }: { className?: string }) {
  const [s, setS] = useState(0);
  useEffect(() => {
    const t0 = Date.now();
    const id = setInterval(() => setS(Math.floor((Date.now() - t0) / 1000)), 1000);
    return () => clearInterval(id);
  }, []);
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return (
    <span className={className} dir="ltr" role="timer" aria-live="off">
      {mm}:{ss}
    </span>
  );
}
