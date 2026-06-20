"use client";

import { useActionState, useState } from "react";
import { changeLeaguePasswordAction } from "@/actions/leagues";
import { Alert } from "./Alert";
import { PasswordInput } from "./PasswordInput";

export function ChangeLeaguePasswordForm({
  leagueId,
  embedded = false,
}: {
  leagueId: string;
  embedded?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(changeLeaguePasswordAction, {});

  const form = (
    <>
      <h3 className={embedded ? "mb-2 text-sm font-semibold" : "mb-3 font-semibold"}>
        Change league password
      </h3>
      {state.error && <Alert type="error" message={state.error} />}
      {state.success && <Alert type="success" message={state.success} />}
      <form action={formAction} className="space-y-3">
        <input type="hidden" name="leagueId" value={leagueId} />
        <div>
          <label className="field-label">New league password</label>
          <PasswordInput name="newPassword" required minLength={4} />
        </div>
        <div>
          <label className="field-label">Your account password</label>
          <PasswordInput name="accountPassword" required />
        </div>
        <button type="submit" className="btn btn-primary w-full" disabled={pending}>
          {pending ? "Updating..." : "Update Password"}
        </button>
      </form>
    </>
  );

  if (embedded) {
    return <div>{form}</div>;
  }

  return (
    <div className="relative">
      <button type="button" className="btn" onClick={() => setOpen((v) => !v)}>
        {open ? "Close" : "Change Password"}
      </button>
      {open && (
        <div className="absolute right-0 z-10 mt-2 w-72 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-lg">
          {form}
        </div>
      )}
    </div>
  );
}
