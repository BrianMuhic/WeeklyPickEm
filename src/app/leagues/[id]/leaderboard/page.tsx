import { redirect } from "next/navigation";
import { LeagueToolbar } from "@/components/LeagueToolbar";
import { LeagueNav } from "@/components/LeagueNav";
import { SeasonLeaderboard, WeeklyLeaderboard } from "@/components/LeaderboardTable";
import { WeekSelector } from "@/components/WeekSelector";
import { getCurrentUser } from "@/lib/auth";
import { LEAGUE_TYPE_LABELS } from "@/lib/constants";
import {
  ensureLeaderboardScoresSynced,
  getLeagueContext,
  getSeasonLeaderboard,
  getWeeklyLeaderboardData,
  leaguePathWithWeek,
} from "@/lib/league-data";

export default async function LeaderboardPage({
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

  if (!weekParam) redirect(leaguePathWithWeek(id, week, "leaderboard"));

  if (!isMember) redirect(`/leagues/${id}/join`);

  await ensureLeaderboardScoresSynced(league.leagueType, league.season, week);

  const { rows: weeklyRows, weekComplete, winnerUsernames } = await getWeeklyLeaderboardData(
    id,
    week,
    league.season
  );
  const seasonRows = await getSeasonLeaderboard(id, league.season);

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{league.name} — Leaderboard</h1>
            <p className="muted text-sm">{LEAGUE_TYPE_LABELS[league.leagueType]}</p>
          </div>
          <LeagueToolbar
            leagueId={id}
            week={week}
            isCommissioner={isCommissioner}
            isPublic={league.isPublic}
          />
        </div>
        <LeagueNav leagueId={id} active="leaderboard" />
        <WeekSelector
          leagueId={id}
          currentWeek={week}
          leagueType={league.leagueType}
          basePath="leaderboard"
        />
      </div>

      <div className="card">
        <h2 className="mb-4 text-xl font-semibold">Week {week} Standings</h2>
        <p className="muted mb-4 text-sm">1 point per correct pick. Ties for 1st all receive a weekly win.</p>
        <WeeklyLeaderboard
          rows={weeklyRows}
          weekComplete={weekComplete}
          winnerUsernames={winnerUsernames}
        />
      </div>

      <div className="card">
        <h2 className="mb-4 text-xl font-semibold">Season Standings</h2>
        <p className="muted mb-4 text-sm">
          Ranked by weekly wins. Tiebreaker: total correct picks across completed weeks.
        </p>
        <SeasonLeaderboard rows={seasonRows} />
      </div>
    </div>
  );
}
