"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { leaveLeagueAction } from "@/actions/leagues";
import { Alert } from "./Alert";

export function LeagueMembershipActions({ leagueId }: { leagueId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleLeave() {
    if (
      !confirm(
        "Leave this league? Your picks will be removed and you can rejoin later if the league is public."
      )
    ) {
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await leaveLeagueAction(leagueId);
      if (result?.error) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-2">
      {error && <Alert type="error" message={error} />}
      <button
        type="button"
        className="btn btn-danger"
        disabled={pending}
        onClick={handleLeave}
      >
        {pending ? "Leaving..." : "Leave League"}
      </button>
    </div>
  );
}
