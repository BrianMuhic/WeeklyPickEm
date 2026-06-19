import { redirect } from "next/navigation";
import { LeagueToolbar } from "@/components/LeagueToolbar";
import { LeagueNav } from "@/components/LeagueNav";
import { WeekSelector } from "@/components/WeekSelector";
import { getCurrentUser } from "@/lib/auth";
import { formatGameDateTime } from "@/lib/datetime";
import { getLeagueContext } from "@/lib/league-data";

export default async function GamesPage({
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
  const { league, isMember, isCommissioner, week, games } = await getLeagueContext(
    id,
    user,
    weekParam
  );

  if (!isMember) redirect(`/leagues/${id}/join`);

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">Games — Week {week}</h1>
          <LeagueToolbar
            leagueId={id}
            isCommissioner={isCommissioner}
            isPrivate={!league.isPublic}
          />
        </div>
        <LeagueNav leagueId={id} active="games" />
        <WeekSelector leagueId={id} currentWeek={week} leagueType={league.leagueType} basePath="games" />
      </div>

      <div className="card">
        {games.length === 0 ? (
          <p className="muted">No games for this week. Use Fetch Scores to load the schedule.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Kickoff</th>
                <th>Matchup</th>
                <th>Score</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {games.map((g) => (
                <tr key={g.id}>
                  <td className="text-sm">{formatGameDateTime(g.kickoff)}</td>
                  <td>
                    {g.awayTeam.abbreviation} @ {g.homeTeam.abbreviation}
                  </td>
                  <td>
                    {g.awayScore != null && g.homeScore != null
                      ? `${g.awayScore} - ${g.homeScore}`
                      : "—"}
                  </td>
                  <td className="capitalize">{g.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
