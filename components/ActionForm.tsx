"use client";

import { useActionState, type ReactNode } from "react";
import type { FormState } from "@/app/actions";

/** A form wired to a server action, with a pending button and inline messages. */
export function ActionForm({
  action,
  submitLabel,
  pendingLabel,
  children,
  className = "grid gap-4",
  variant = "primary",
  extraActions,
}: {
  action: (state: FormState, fd: FormData) => Promise<FormState>;
  submitLabel: string;
  pendingLabel: string;
  children?: ReactNode;
  className?: string;
  variant?: "primary" | "plain" | "quiet";
  extraActions?: ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const btn = variant === "primary" ? "btn btn-primary" : variant === "quiet" ? "btn btn-quiet" : "btn";
  return (
    <form action={formAction} className={className}>
      {children}
      {state?.error && (
        <p role="alert" className="notice">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p role="status" className="notice notice-ok">
          {state.ok}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className={btn} disabled={pending}>
          {pending ? pendingLabel : submitLabel}
        </button>
        {extraActions}
      </div>
    </form>
  );
}
