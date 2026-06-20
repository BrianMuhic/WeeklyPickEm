import Link from "next/link";
import { redirect } from "next/navigation";
import { LeagueToolbar } from "@/components/LeagueToolbar";
import { LeagueNav } from "@/components/LeagueNav";
import { PicksForm } from "@/components/PicksForm";
import { PicksLockButton } from "@/components/PicksLockButton";
import { WeekSelector } from "@/components/WeekSelector";
import { getCurrentUser } from "@/lib/auth";
import { LEAGUE_TYPE_LABELS } from "@/lib/constants";
import { formatGameDateTime } from "@/lib/datetime";
import { getLeagueContext, getUserPicksForWeek, leaguePathWithWeek } from "@/lib/league-data";

export default async function LeaguePicksPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ week?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const { week: weekParam } = await searchParams;
  const { league, isMember, isCommissioner, week, games, deadline, picksOpen } =
    await getLeagueContext(id, user, weekParam);

  if (!weekParam) redirect(leaguePathWithWeek(id, week));

  if (!isMember) {
    return (
      <div className="card">
        <h1 className="text-2xl font-bold">{league.name}</h1>
        <p className="muted mt-2">
          {LEAGUE_TYPE_LABELS[league.leagueType]} · Commissioner: @{league.commissioner.username}
        </p>
        <Link href={`/leagues/${id}/join`} className="btn btn-primary mt-4">
          Join this league
        </Link>
      </div>
    );
  }

  const pickMap = await getUserPicksForWeek(
    user.id,
    id,
    games.map((g) => g.id)
  );

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{league.name}</h1>
            <p className="muted text-sm">
              {LEAGUE_TYPE_LABELS[league.leagueType]} · Season {league.season} ·{" "}
              {league.members.length} members
              {isCommissioner ? " · You are the commissioner" : ""}
            </p>
          </div>
          <LeagueToolbar
            leagueId={id}
            week={week}
            isCommissioner={isCommissioner}
            isPublic={league.isPublic}
          />
        </div>
        <LeagueNav leagueId={id} active="picks" />
        <WeekSelector leagueId={id} currentWeek={week} leagueType={league.leagueType} />
      </div>

      <div className="card">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-xl font-semibold">Week {week} Picks</h2>
          {isCommissioner && (
            <PicksLockButton
              leagueId={id}
              week={week}
              season={league.season}
              picksOpen={picksOpen}
            />
          )}
        </div>
        <PicksForm
          leagueId={id}
          week={week}
          canPick={picksOpen}
          deadline={deadline ? formatGameDateTime(deadline) : null}
          games={games.map((g) => ({
            id: g.id,
            away: g.awayTeam.abbreviation,
            home: g.homeTeam.abbreviation,
            kickoff: g.kickoff.toISOString(),
            status: g.status,
            awayScore: g.awayScore,
            homeScore: g.homeScore,
            winner: g.winner,
            userPick: pickMap.get(g.id) ?? null,
          }))}
        />
      </div>
    </div>
  );
}
