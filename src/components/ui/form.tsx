"use client";

import { createContext, useActionState, useContext, useEffect, useId, useRef, type ComponentProps, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import type { ActionState } from "@/lib/action-state";
import { cn } from "@/lib/cn";
import { Alert } from "./primitives";
import { buttonClass } from "./button";

const Ctx = createContext<ActionState>(null);

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

/** Translate an error code, falling back to a generic message for unknown codes. */
export function useErrorText() {
  const t = useTranslations("errors");
  return (code?: string) => (code ? (t.has(code) ? t(code) : t("unexpected")) : "");
}

/**
 * Form bound to a server action. Shows translated error/success states,
 * moves focus to the message, and keeps entered values after an error.
 */
export function ActionForm({
  action,
  children,
  className,
  successText,
}: {
  action: Action;
  children: ReactNode;
  className?: string;
  successText?: string;
}) {
  const [state, formAction] = useActionState(action, null);
  const errorText = useErrorText();
  const ts = useTranslations("common.success");
  const tc = useTranslations("common");
  const msgRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (state && (!state.ok || state.success || successText)) msgRef.current?.focus();
  }, [state, successText]);

  const hasFieldErrors = !!state && !state.ok && state.fieldErrors && Object.keys(state.fieldErrors).length > 0;
  const success = state?.ok ? (state.success && ts.has(state.success) ? ts(state.success) : successText) : null;

  return (
    <form action={formAction} className={className} noValidate>
      <Ctx.Provider value={state}>
        <div ref={msgRef} tabIndex={-1} className="outline-none">
          {state && !state.ok ? (
            <Alert tone="danger" role="alert" className="mb-5">
              {state.error ? errorText(state.error) : hasFieldErrors ? tc("fixErrors") : errorText("unexpected")}
            </Alert>
          ) : null}
          {success ? (
            <Alert tone="success" role="status" className="mb-5">
              {success}
            </Alert>
          ) : null}
        </div>
        {children}
      </Ctx.Provider>
    </form>
  );
}

const inputClass =
  "block w-full rounded-xl border border-line-strong bg-white px-3.5 py-2.5 text-[0.95rem] text-navy-900 placeholder:text-muted/70 " +
  "transition-colors hover:border-navy-300 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 " +
  "aria-[invalid=true]:border-red-700 aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-red-700/10 disabled:bg-paper-2";

function useField(name: string) {
  const state = useContext(Ctx);
  const id = useId();
  const errorText = useErrorText();
  const code = state && !state.ok ? state.fieldErrors?.[name] : undefined;
  return { id, error: code ? errorText(code) : "", echoed: state && !state.ok ? state.values?.[name] : undefined };
}

function Shell({ id, label, hint, error, optional, children }: { id: string; label: ReactNode; hint?: ReactNode; error: string; optional?: boolean; children: ReactNode }) {
  const tc = useTranslations("common");
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 flex items-baseline justify-between gap-2 text-sm font-semibold text-navy-900">
        <span>{label}</span>
        {optional ? <span className="text-xs font-normal text-muted">{tc("optional")}</span> : null}
      </label>
      {children}
      {hint && !error ? (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-xs font-medium text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}

type FieldBase = { name: string; label: ReactNode; hint?: ReactNode; optional?: boolean };

export function Field({ name, label, hint, optional, className, defaultValue, type = "text", ...props }: FieldBase & ComponentProps<"input">) {
  const f = useField(name);
  const secret = type === "password";
  return (
    <Shell id={f.id} label={label} hint={hint} error={f.error} optional={optional}>
      <input
        {...props}
        id={f.id}
        name={name}
        type={type}
        required={!optional && props.required !== false}
        defaultValue={secret ? undefined : (f.echoed ?? defaultValue)}
        aria-invalid={f.error ? true : undefined}
        aria-describedby={f.error ? `${f.id}-error` : hint ? `${f.id}-hint` : undefined}
        className={cn(inputClass, className)}
      />
    </Shell>
  );
}

export function TextareaField({ name, label, hint, optional, className, defaultValue, ...props }: FieldBase & ComponentProps<"textarea">) {
  const f = useField(name);
  return (
    <Shell id={f.id} label={label} hint={hint} error={f.error} optional={optional}>
      <textarea
        rows={4}
        {...props}
        id={f.id}
        name={name}
        required={!optional}
        defaultValue={f.echoed ?? defaultValue}
        aria-invalid={f.error ? true : undefined}
        aria-describedby={f.error ? `${f.id}-error` : hint ? `${f.id}-hint` : undefined}
        className={cn(inputClass, "leading-relaxed", className)}
      />
    </Shell>
  );
}

export function SelectField({ name, label, hint, optional, className, defaultValue, children, ...props }: FieldBase & ComponentProps<"select">) {
  const f = useField(name);
  return (
    <Shell id={f.id} label={label} hint={hint} error={f.error} optional={optional}>
      <select
        {...props}
        key={f.echoed ?? "initial"}
        id={f.id}
        name={name}
        required={!optional}
        defaultValue={f.echoed ?? defaultValue}
        aria-invalid={f.error ? true : undefined}
        aria-describedby={f.error ? `${f.id}-error` : hint ? `${f.id}-hint` : undefined}
        className={cn(inputClass, "pe-9", className)}
      >
        {children}
      </select>
    </Shell>
  );
}

export function CheckboxField({ name, label, defaultChecked, value = "on" }: { name: string; label: ReactNode; defaultChecked?: boolean; value?: string }) {
  const id = useId();
  return (
    <div className="flex items-start gap-3">
      <input id={id} name={name} type="checkbox" value={value} defaultChecked={defaultChecked} className="mt-1 size-4.5 shrink-0 rounded border-line-strong accent-emerald-600" />
      <label htmlFor={id} className="text-sm text-navy-900">
        {label}
      </label>
    </div>
  );
}

export function SubmitButton({
  children,
  variant = "primary",
  size = "md",
  className,
  ...props
}: { variant?: Parameters<typeof buttonClass>[0]; size?: Parameters<typeof buttonClass>[1] } & ComponentProps<"button">) {
  const { pending } = useFormStatus();
  return (
    <button {...props} type="submit" disabled={pending || props.disabled} aria-busy={pending} className={buttonClass(variant, size, className)}>
      {pending ? <Loader2 aria-hidden className="size-4 animate-spin" /> : null}
      {children}
    </button>
  );
}

/** A one-button form for simple actions (e.g. revoke, mark handled), with inline error display. */
export function ActionButton({
  action,
  fields,
  children,
  variant = "light",
  size = "sm",
  confirm,
}: {
  action: Action;
  fields?: Record<string, string>;
  children: ReactNode;
  variant?: Parameters<typeof buttonClass>[0];
  size?: Parameters<typeof buttonClass>[1];
  confirm?: string;
}) {
  const [state, formAction] = useActionState(action, null);
  const errorText = useErrorText();
  return (
    <form
      action={formAction}
      className="inline-flex flex-col items-start gap-1"
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {Object.entries(fields ?? {}).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <SubmitButton variant={variant} size={size}>
        {children}
      </SubmitButton>
      {state && !state.ok ? (
        <span role="alert" className="text-xs font-medium text-red-700">
          {errorText(state.error)}
        </span>
      ) : null}
    </form>
  );
}
