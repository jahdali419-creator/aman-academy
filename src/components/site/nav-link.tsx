"use client";

import type { ReactNode } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

export function NavLink({ href, children, exact, className }: { href: string; children: ReactNode; exact?: boolean; className?: string }) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "whitespace-nowrap rounded-full px-3 py-2 text-[0.95rem] font-medium text-navy-700 transition-colors hover:bg-navy-50 hover:text-navy-900",
        "aria-[current=page]:bg-navy-900 aria-[current=page]:text-white",
        className,
      )}
    >
      {children}
    </Link>
  );
}

/** Horizontally scrollable tabs for dashboard areas (mobile-friendly). */
export function AreaTabs({ label, items }: { label: string; items: { href: string; label: string; exact?: boolean }[] }) {
  return (
    <nav aria-label={label} className="no-print -mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
      <ul className="flex w-max gap-1 rounded-full border border-line bg-white p-1 shadow-soft">
        {items.map((i) => (
          <li key={i.href}>
            <NavLink href={i.href} exact={i.exact} className="block whitespace-nowrap px-4 py-1.5 text-sm">
              {i.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
