import { Conference, LeagueType, PickLockOverride, Sport } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { LEAGUE_TYPE_TO_CONFERENCE } from "@/lib/constants";

export function sportForLeague(leagueType: LeagueType): Sport {
  if (leagueType === LeagueType.NFL) return Sport.NFL;
  if (leagueType === LeagueType.MLB) return Sport.MLB;
  return Sport.COLLEGE_FOOTBALL;
}

export async function getSeasonGamesForLeague(leagueType: LeagueType, season: number) {
  const sport = sportForLeague(leagueType);
  const targetConference = LEAGUE_TYPE_TO_CONFERENCE[leagueType];

  const games = await prisma.game.findMany({
    where: { sport, season },
    select: {
      week: true,
      kickoff: true,
      awayTeam: { select: { conference: true } },
      homeTeam: { select: { conference: true } },
    },
    orderBy: { kickoff: "asc" },
  });

  if (leagueType === LeagueType.NFL || leagueType === LeagueType.MLB) {
    return games;
  }

  return games.filter(
    (g) =>
      g.awayTeam.conference === targetConference ||
      g.homeTeam.conference === targetConference
  );
}

export async function getLeagueGames(leagueType: LeagueType, season: number, week: number) {
  const sport = sportForLeague(leagueType);
  const targetConference = LEAGUE_TYPE_TO_CONFERENCE[leagueType];

  const games = await prisma.game.findMany({
    where: { sport, season, week },
    include: { awayTeam: true, homeTeam: true },
    orderBy: { kickoff: "asc" },
  });

  if (leagueType === LeagueType.NFL || leagueType === LeagueType.MLB) {
    return games;
  }

  return games.filter(
    (g) =>
      g.awayTeam.conference === targetConference ||
      g.homeTeam.conference === targetConference
  );
}

export function gameInvolvesConference(
  awayConf: Conference,
  homeConf: Conference,
  target: Conference
) {
  return awayConf === target || homeConf === target;
}

export async function getFirstKickoff(leagueType: LeagueType, season: number, week: number) {
  const games = await getLeagueGames(leagueType, season, week);
  if (games.length === 0) return null;
  return games[0].kickoff;
}

export async function ensurePickDeadline(leagueId: string, leagueType: LeagueType, season: number, week: number) {
  const firstKickoff = await getFirstKickoff(leagueType, season, week);
  if (!firstKickoff) {
    const existing = await prisma.pickDeadline.findUnique({
      where: { leagueId_week_season: { leagueId, week, season } },
    });
    return existing?.deadline ?? null;
  }

  const deadline = await prisma.pickDeadline.upsert({
    where: { leagueId_week_season: { leagueId, week, season } },
    create: { leagueId, week, season, deadline: firstKickoff },
    update: { deadline: firstKickoff },
  });

  return deadline.deadline;
}

export async function canMakePicks(leagueId: string, leagueType: LeagueType, season: number, week: number) {
  const record = await prisma.pickDeadline.findUnique({
    where: { leagueId_week_season: { leagueId, week, season } },
  });

  if (record?.lockOverride === PickLockOverride.LOCKED) return false;
  if (record?.lockOverride === PickLockOverride.UNLOCKED) return true;

  const deadline = record?.deadline ?? (await ensurePickDeadline(leagueId, leagueType, season, week));
  if (!deadline) return true;
  return new Date() < deadline;
}

export function getCurrentWeekFromGames(games: { week: number; kickoff: Date }[]) {
  if (games.length === 0) return 1;
  const now = new Date();
  const upcoming = games.filter((g) => g.kickoff >= now);
  if (upcoming.length > 0) {
    return Math.min(...upcoming.map((g) => g.week));
  }
  return Math.max(...games.map((g) => g.week));
}
