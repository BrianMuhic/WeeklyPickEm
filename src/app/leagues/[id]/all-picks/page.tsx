import { redirect } from "next/navigation";
import { LeagueNav } from "@/components/LeagueNav";
import { LeagueToolbar } from "@/components/LeagueToolbar";
import { WeekSelector } from "@/components/WeekSelector";
import { getCurrentUser } from "@/lib/auth";
import { getAllPicksForLeague, getLeagueContext, leaguePathWithWeek } from "@/lib/league-data";

export default async function AllPicksPage({
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
  const { league, isMember, isCommissioner, week } = await getLeagueContext(
    id,
    user,
    weekParam
  );

  if (!weekParam) redirect(leaguePathWithWeek(id, week, "all-picks"));

  if (!isMember) redirect(`/leagues/${id}/join`);

  const { games, members, pickMap } = await getAllPicksForLeague(id, week, league.season);

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">All Picks — Week {week}</h1>
          <LeagueToolbar
            leagueId={id}
            week={week}
            isCommissioner={isCommissioner}
            isPublic={league.isPublic}
          />
        </div>
        <LeagueNav leagueId={id} active="picks-grid" />
        <WeekSelector
          leagueId={id}
          currentWeek={week}
          leagueType={league.leagueType}
          basePath="all-picks"
        />
      </div>

      <div className="card overflow-x-auto">
        {games.length === 0 ? (
          <p className="muted">No games for this week.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Player</th>
                {games.map((g) => (
                  <th key={g.id} className="text-xs">
                    {g.awayTeam.abbreviation}@{g.homeTeam.abbreviation}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.map((m) => {
                const userPicks = pickMap.get(m.user.id);
                return (
                  <tr key={m.user.id}>
                    <td>
                      <strong>@{m.user.username}</strong>
                    </td>
                    {games.map((g) => {
                      const pick = userPicks?.get(g.id);
                      const correct = g.winner && pick === g.winner;
                      const wrong = g.winner && pick && pick !== g.winner;
                      const display = pick
                        ? pick === "away"
                          ? g.awayTeam.abbreviation
                          : g.homeTeam.abbreviation
                        : "—";
                      return (
                        <td key={g.id} className="text-center text-sm">
                          {g.winner ? (correct ? "✅" : wrong ? "❌" : "⏳") : ""} {display}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
