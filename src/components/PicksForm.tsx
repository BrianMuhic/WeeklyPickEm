"use client";

import { useActionState } from "react";
import { submitPicksAction } from "@/actions/picks";
import { Alert } from "./Alert";
import type { ActionResult } from "@/actions/auth";
import { formatGameDateTime } from "@/lib/datetime";

type GameRow = {
  id: string;
  away: string;
  home: string;
  kickoff: string;
  status: string;
  awayScore: number | null;
  homeScore: number | null;
  winner: string | null;
  userPick: string | null;
};

export function PicksForm({
  leagueId,
  week,
  games,
  canPick,
  deadline,
}: {
  leagueId: string;
  week: number;
  games: GameRow[];
  canPick: boolean;
  deadline: string | null;
}) {
  const boundAction = submitPicksAction.bind(null, leagueId, week);
  const [state, formAction, pending] = useActionState(boundAction, {});

  if (games.length === 0) {
    return (
      <p className="muted">
        No games for this week yet. Try the Fetch Scores button to load the latest schedule.
      </p>
    );
  }

  return (
    <div>
      {!canPick && (
        <Alert
          type="warning"
          message={`Picks are closed for Week ${week}.${deadline ? ` Deadline was ${deadline}.` : ""}`}
        />
      )}
      {deadline && canPick && (
        <Alert type="success" message={`Picks close: ${deadline}`} />
      )}
      {state.error && <Alert type="error" message={state.error} />}
      {state.success && <Alert type="success" message={state.success} />}

      <form action={formAction} className={!canPick ? "pointer-events-none opacity-50" : ""}>
        <div className="space-y-3">
          {games.map((game) => (
            <div key={game.id} className="game-row">
              <div className="text-sm muted mb-2">
                {formatGameDateTime(game.kickoff)}
                {game.winner && (
                  <span className="ml-2">
                    Final: {game.awayScore} - {game.homeScore}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className={`pick-option ${game.userPick === "away" ? "pick-selected" : ""}`}>
                  <input
                    type="radio"
                    name={`game_${game.id}`}
                    value="away"
                    defaultChecked={game.userPick === "away"}
                    required
                    disabled={!canPick}
                  />
                  <span>{game.away}</span>
                </label>
                <label className={`pick-option ${game.userPick === "home" ? "pick-selected" : ""}`}>
                  <input
                    type="radio"
                    name={`game_${game.id}`}
                    value="home"
                    defaultChecked={game.userPick === "home"}
                    required
                    disabled={!canPick}
                  />
                  <span>{game.home}</span>
                </label>
              </div>
            </div>
          ))}
        </div>
        {canPick && (
          <button type="submit" className="btn btn-primary mt-4" disabled={pending}>
            {pending ? "Saving..." : "Save Picks"}
          </button>
        )}
      </form>
    </div>
  );
}
