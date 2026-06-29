import { LeagueType } from "@/generated/prisma/client";
import { notFound, redirect } from "next/navigation";
import { currentSeasonYear, maxWeeksForLeague } from "@/lib/constants";
import { syncGamesForLeagueType, syncGamesForLeagueTypeWeek } from "@/lib/espn/sync";
import {
  canMakePicks,
  ensurePickDeadline,
  getCurrentWeekFromGames,
  getLeagueGames,
  getSeasonGamesForLeague,
  sportForLeague,
} from "@/lib/games";
import { prisma } from "@/lib/prisma";
import {
  computeSeasonStandings,
  computeWeeklyScores,
  getWeeklyWinners,
  isWeekComplete,
} from "@/lib/scoring";
import type { SessionUser } from "@/lib/session";

export async function ensureLeagueSeason(league: {
  id: string;
  season: number;
  leagueType: LeagueType;
}): Promise<number> {
  const season = currentSeasonYear();
  if (league.season === season) return season;

  await prisma.league.update({ where: { id: league.id }, data: { season } });
  league.season = season;

  const sport = sportForLeague(league.leagueType);
  const gameCount = await prisma.game.count({ where: { sport, season } });
  if (gameCount === 0) {
    try {
      await syncGamesForLeagueType(league.leagueType, season);
    } catch (e) {
      console.error("Failed to sync games for season", season, e);
    }
  }

  return season;
}

export async function getLeagueContext(leagueId: string, user: SessionUser | null, weekParam?: string) {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    include: {
      commissioner: { select: { username: true } },
      members: {
        include: { user: { select: { id: true, username: true, name: true } } },
      },
    },
  });

  if (!league) notFound();

  const isMember = user
    ? league.members.some((m) => m.userId === user.id)
    : false;
  const isCommissioner = user ? league.commissionerId === user.id : false;

  if (user && !isMember && !league.isPublic) {
    redirect(`/leagues/${leagueId}/join`);
  }

  const season = await ensureLeagueSeason(league);

  const maxWeeks = maxWeeksForLeague(league.leagueType);
  let week: number;
  if (weekParam) {
    week = parseInt(weekParam, 10);
    if (isNaN(week) || week < 1) week = 1;
  } else {
    const seasonGames = await getSeasonGamesForLeague(league.leagueType, season);
    week = getCurrentWeekFromGames(seasonGames);
  }
  if (week > maxWeeks) week = maxWeeks;

  const games = await getLeagueGames(league.leagueType, season, week);
  const deadline = await ensurePickDeadline(leagueId, league.leagueType, season, week);
  const picksOpen = await canMakePicks(leagueId, league.leagueType, season, week);

  return { league, isMember, isCommissioner, week, games, deadline, picksOpen };
}

export function leaguePathWithWeek(leagueId: string, week: number, subpath?: string) {
  const base = subpath ? `/leagues/${leagueId}/${subpath}` : `/leagues/${leagueId}`;
  return `${base}?week=${week}`;
}

export async function getUserPicksForWeek(
  userId: string,
  leagueId: string,
  gameIds: string[]
) {
  if (gameIds.length === 0) return new Map<string, string>();
  const picks = await prisma.pick.findMany({
    where: { userId, leagueId, gameId: { in: gameIds } },
  });
  return new Map(picks.map((p) => [p.gameId, p.pick]));
}

export async function ensureLeaderboardScoresSynced(
  leagueType: LeagueType,
  season: number,
  viewedWeek: number
) {
  const maxWeeks = maxWeeksForLeague(leagueType);
  const now = new Date();
  const weeksToSync = new Set<number>([viewedWeek]);

  for (let week = 1; week <= maxWeeks; week++) {
    if (week === viewedWeek) continue;

    const games = await getLeagueGames(leagueType, season, week);
    if (games.length === 0 || isWeekComplete(games)) continue;

    const latestKickoff = games.reduce(
      (latest, game) => (game.kickoff > latest ? game.kickoff : latest),
      games[0].kickoff
    );
    if (latestKickoff < now) {
      weeksToSync.add(week);
    }
  }

  for (const week of weeksToSync) {
    try {
      await syncGamesForLeagueTypeWeek(leagueType, season, week);
    } catch (e) {
      console.error("Failed to sync scores for week", week, e);
    }
  }
}

export async function getWeeklyLeaderboard(leagueId: string, week: number, season: number) {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    include: {
      members: { include: { user: { select: { id: true, username: true, name: true } } } },
    },
  });
  if (!league) return [];

  const games = await getLeagueGames(league.leagueType, season, week);
  const gameIds = games.map((g) => g.id);

  const picks = await prisma.pick.findMany({
    where: { leagueId, gameId: { in: gameIds } },
    include: { game: true },
  });

  const members = league.members.map((m) => ({
    userId: m.user.id,
    username: m.user.username,
    name: m.user.name,
  }));

  return computeWeeklyScores(members, picks);
}

export async function getWeeklyLeaderboardData(leagueId: string, week: number, season: number) {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    include: {
      members: { include: { user: { select: { id: true, username: true, name: true } } } },
    },
  });
  if (!league) return { rows: [], weekComplete: false, winnerUsernames: [] as string[] };

  const games = await getLeagueGames(league.leagueType, season, week);
  const gameIds = games.map((g) => g.id);

  const picks = await prisma.pick.findMany({
    where: { leagueId, gameId: { in: gameIds } },
    include: { game: true },
  });

  const members = league.members.map((m) => ({
    userId: m.user.id,
    username: m.user.username,
    name: m.user.name,
  }));

  const rows = computeWeeklyScores(members, picks);
  const weekComplete = isWeekComplete(games);
  const winnerUsernames = weekComplete
    ? getWeeklyWinners(rows).map((winner) => winner.username)
    : [];

  return { rows, weekComplete, winnerUsernames };
}

export async function getSeasonLeaderboard(leagueId: string, season: number) {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    include: {
      members: { include: { user: { select: { id: true, username: true, name: true } } } },
    },
  });
  if (!league) return [];

  const members = league.members.map((m) => ({
    userId: m.user.id,
    username: m.user.username,
    name: m.user.name,
  }));

  const maxWeeks = maxWeeksForLeague(league.leagueType);
  const weeklyScoresByWeek = new Map<number, ReturnType<typeof computeWeeklyScores>>();

  for (let week = 1; week <= maxWeeks; week++) {
    const games = await getLeagueGames(league.leagueType, season, week);
    if (!isWeekComplete(games)) continue;

    const scores = await getWeeklyLeaderboard(leagueId, week, season);
    if (scores.length > 0) {
      weeklyScoresByWeek.set(week, scores);
    }
  }

  return computeSeasonStandings(members, weeklyScoresByWeek);
}

export async function getAllPicksForLeague(leagueId: string, week: number, season: number) {
  const league = await prisma.league.findUnique({ where: { id: leagueId } });
  if (!league) return { games: [], members: [], pickMap: new Map<string, Map<string, string>>() };

  const games = await getLeagueGames(league.leagueType, season, week);
  const members = await prisma.leagueMember.findMany({
    where: { leagueId },
    include: { user: { select: { id: true, username: true } } },
    orderBy: { user: { username: "asc" } },
  });

  const gameIds = games.map((g) => g.id);
  const picks = await prisma.pick.findMany({
    where: { leagueId, gameId: { in: gameIds } },
  });

  const pickMap = new Map<string, Map<string, string>>();
  for (const pick of picks) {
    if (!pickMap.has(pick.userId)) pickMap.set(pick.userId, new Map());
    pickMap.get(pick.userId)!.set(pick.gameId, pick.pick);
  }

  return { games, members, pickMap };
}
