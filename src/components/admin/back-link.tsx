import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";

/** Small "back to list" link shown above admin detail pages. */
export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1.5 text-sm font-medium text-navy-700 hover:text-navy-900">
      <ArrowLeft aria-hidden className="size-4 rtl:-scale-x-100" />
      {children}
    </Link>
  );
}
