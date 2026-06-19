"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { togglePicksLockAction } from "@/actions/leagues";

export function PicksLockButton({
  leagueId,
  week,
  season,
  picksOpen,
}: {
  leagueId: string;
  week: number;
  season: number;
  picksOpen: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      type="button"
      className="btn"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          await togglePicksLockAction(leagueId, week, season);
          router.refresh();
        });
      }}
    >
      {pending ? "..." : picksOpen ? "Lock" : "Unlock"}
    </button>
  );
}
