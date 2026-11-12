import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { MailCheck, MailX } from "lucide-react";
import { database } from "@/server/db/client";
import { getViewer } from "@/server/auth/session";
import { acceptInviteAction } from "@/server/actions/invite";
import { getInvitationByToken } from "@/server/services/company";
import { ButtonLink } from "@/components/ui/button";
import { ActionButton } from "@/components/ui/form";
import { Alert, EmptyState, Ltr } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: (await getTranslations({ locale, namespace: "auth" }))("invite.meta"), robots: { index: false }, referrer: "no-referrer" };
}

export default async function InvitePage({ params }: { params: Promise<{ locale: string; token: string }> }) {
  const { locale, token } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("auth.invite");
  const valid = /^[a-f0-9]{64}$/.test(token);
  const [inv, viewer] = await Promise.all([valid ? getInvitationByToken(await database(), token) : null, getViewer()]);

  return (
    <div className="container-page py-16 sm:py-24">
      <div className="mx-auto max-w-xl">
        {!inv?.usable ? (
          <EmptyState icon={<MailX aria-hidden className="size-6" />} title={t("invalidTitle")} action={<ButtonLink href="/" variant="light">{(await getTranslations("common"))("actions.goHome")}</ButtonLink>}>
            {t("invalidBody")}
          </EmptyState>
        ) : (
          <div className="rounded-3xl border border-line bg-white p-8 text-center shadow-lift sm:p-10">
            <span className="mx-auto grid size-14 place-items-center rounded-full bg-emerald-50 text-emerald-600"><MailCheck aria-hidden className="size-7" /></span>
            <h1 className="mt-6 text-3xl font-semibold text-navy-900">{t("title")}</h1>
            <p className="mt-3 text-lg text-muted">{t("body", { company: inv.orgName })}</p>
            <p className="mt-4 text-sm text-muted">{t("invitedEmail")}: <Ltr className="font-semibold text-navy-900">{inv.email}</Ltr></p>
            <div className="mt-8 flex flex-col items-center gap-3">
              {viewer ? (
                viewer.email.toLowerCase() === inv.email ? (
                  <ActionButton action={acceptInviteAction} fields={{ token }} variant="primary" size="lg">{t("accept")}</ActionButton>
                ) : (
                  <Alert tone="warning" className="text-start">{t("wrongAccount")}</Alert>
                )
              ) : (
                <>
                  <ButtonLink href={{ pathname: "/register", query: { invite: token } }} size="lg">{t("create")}</ButtonLink>
                  <ButtonLink href={{ pathname: "/sign-in", query: { next: `/invite/${token}` } }} variant="ghost">{t("signInInstead")}</ButtonLink>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
