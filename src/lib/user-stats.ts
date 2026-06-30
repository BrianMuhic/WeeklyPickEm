import { getSeasonLeaderboard } from "@/lib/league-data";
import { currentSeasonYear } from "@/lib/constants";
import { LEAGUE_TYPES } from "@/lib/types";
import { prisma } from "@/lib/prisma";
import { getGameWinner, scorePick } from "@/lib/scoring";
import type { LeagueTypeValue } from "@/lib/types";

export interface LeagueTypeBreakdown {
  correctPickPercentage: number | null;
  leaguesJoined: number;
}

export interface UserStats {
  username: string;
  name: string;
  overall: {
    correctPickPercentage: number | null;
    averagePlace: number | null;
    leagueCount: number;
  };
  byLeagueType: Record<LeagueTypeValue, LeagueTypeBreakdown>;
}

function pickPercentage(correct: number, scored: number): number | null {
  if (scored === 0) return null;
  return (correct / scored) * 100;
}

export async function getUserStats(userId: string): Promise<UserStats> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { username: true, name: true },
  });
  if (!user) throw new Error("User not found");

  const memberships = await prisma.leagueMember.findMany({
    where: { userId },
    include: { league: { select: { id: true, leagueType: true, season: true } } },
  });

  const picks = await prisma.pick.findMany({
    where: { userId },
    include: { game: true, league: { select: { leagueType: true } } },
  });

  let overallCorrect = 0;
  let overallScored = 0;
  const byType = Object.fromEntries(
    LEAGUE_TYPES.map((type) => [type, { correct: 0, scored: 0, leagues: new Set<string>() }])
  ) as Record<
    LeagueTypeValue,
    { correct: number; scored: number; leagues: Set<string> }
  >;

  for (const membership of memberships) {
    byType[membership.league.leagueType].leagues.add(membership.league.id);
  }

  for (const pick of picks) {
    if (!getGameWinner(pick.game)) continue;
    const type = pick.league.leagueType;
    byType[type].scored++;
    overallScored++;
    const points = scorePick(pick);
    byType[type].correct += points;
    overallCorrect += points;
  }

  const season = currentSeasonYear();
  const places: number[] = [];
  for (const membership of memberships) {
    const standings = await getSeasonLeaderboard(membership.league.id, season);
    const rank = standings.findIndex((s) => s.userId === userId);
    if (rank !== -1) places.push(rank + 1);
  }

  return {
    username: user.username,
    name: user.name,
    overall: {
      correctPickPercentage: pickPercentage(overallCorrect, overallScored),
      averagePlace:
        places.length > 0 ? places.reduce((sum, place) => sum + place, 0) / places.length : null,
      leagueCount: memberships.length,
    },
    byLeagueType: Object.fromEntries(
      LEAGUE_TYPES.map((type) => [
        type,
        {
          correctPickPercentage: pickPercentage(byType[type].correct, byType[type].scored),
          leaguesJoined: byType[type].leagues.size,
        },
      ])
    ) as Record<LeagueTypeValue, LeagueTypeBreakdown>,
  };
}
