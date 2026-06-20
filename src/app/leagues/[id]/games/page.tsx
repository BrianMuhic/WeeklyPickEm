import { redirect } from "next/navigation";
import { LeagueToolbar } from "@/components/LeagueToolbar";
import { LeagueNav } from "@/components/LeagueNav";
import { WeekSelector } from "@/components/WeekSelector";
import { getCurrentUser } from "@/lib/auth";
import { formatGameDateTime } from "@/lib/datetime";
import { getLeagueContext, leaguePathWithWeek } from "@/lib/league-data";

const STATUS_LABELS: Record<string, string> = {
  status_final: "Final",
  status_in_progress: "In Progress",
  status_postponed: "Postponed",
  status_scheduled: "Scheduled",
};

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

  if (!weekParam) redirect(leaguePathWithWeek(id, week, "games"));

  if (!isMember) redirect(`/leagues/${id}/join`);

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">Games — Week {week}</h1>
          <LeagueToolbar
            leagueId={id}
            week={week}
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
                  <td>{STATUS_LABELS[g.status] ?? g.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
