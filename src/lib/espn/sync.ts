import { Conference, LeagueType, Sport } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { fetchNflSeasonGames } from "./nfl";
import { fetchMlbSeasonGames } from "./mlb";
import { fetchCollegeSeasonGames } from "./college";
import { mapEspnConferenceId } from "./conferences";
import { EspnGameData } from "./types";

function resolveTeamConference(sport: Sport, espnConferenceId: string | null): Conference {
  if (sport === Sport.NFL) return Conference.NFL;
  if (sport === Sport.MLB) return Conference.MLB;
  return mapEspnConferenceId(espnConferenceId) ?? Conference.OTHER;
}

async function upsertTeam(teamData: EspnGameData["away"], sport: Sport) {
  const conference = resolveTeamConference(sport, teamData.conference);

  return prisma.team.upsert({
    where: { espnId_sport: { espnId: teamData.espnId, sport } },
    create: {
      espnId: teamData.espnId,
      abbreviation: teamData.abbreviation,
      displayName: teamData.displayName,
      conference,
      sport,
    },
    update: {
      abbreviation: teamData.abbreviation,
      displayName: teamData.displayName,
      conference,
    },
  });
}

async function upsertGame(game: EspnGameData, sport: Sport) {
  const awayTeam = await upsertTeam(game.away, sport);
  const homeTeam = await upsertTeam(game.home, sport);

  return prisma.game.upsert({
    where: { espnGameId_sport: { espnGameId: game.espnGameId, sport } },
    create: {
      espnGameId: game.espnGameId,
      sport,
      week: game.week,
      season: 0, // set by caller
      awayTeamId: awayTeam.id,
      homeTeamId: homeTeam.id,
      kickoff: game.kickoff,
      status: game.status,
      awayScore: game.awayScore,
      homeScore: game.homeScore,
      winner: game.winner,
    },
    update: {
      week: game.week,
      kickoff: game.kickoff,
      status: game.status,
      awayScore: game.awayScore,
      homeScore: game.homeScore,
      winner: game.winner,
    },
  });
}

export async function syncNflGames(season: number) {
  const games = await fetchNflSeasonGames(season);
  const syncedEspnIds = new Set<string>();

  for (const game of games) {
    await upsertGame(game, Sport.NFL);
    await prisma.game.update({
      where: { espnGameId_sport: { espnGameId: game.espnGameId, sport: Sport.NFL } },
      data: { season },
    });
    syncedEspnIds.add(game.espnGameId);
  }

  if (syncedEspnIds.size > 0) {
    await prisma.game.deleteMany({
      where: {
        sport: Sport.NFL,
        season,
        espnGameId: { notIn: [...syncedEspnIds] },
      },
    });
  }

  return games.length;
}

export async function syncMlbGames(season: number) {
  const games = await fetchMlbSeasonGames(season);
  const syncedEspnIds = new Set<string>();

  for (const game of games) {
    await upsertGame(game, Sport.MLB);
    await prisma.game.update({
      where: { espnGameId_sport: { espnGameId: game.espnGameId, sport: Sport.MLB } },
      data: { season },
    });
    syncedEspnIds.add(game.espnGameId);
  }

  if (syncedEspnIds.size > 0) {
    await prisma.game.deleteMany({
      where: {
        sport: Sport.MLB,
        season,
        espnGameId: { notIn: [...syncedEspnIds] },
      },
    });
  }

  return games.length;
}

export async function syncCollegeGames(season: number) {
  const games = await fetchCollegeSeasonGames(season);
  let count = 0;
  for (const game of games) {
    await upsertGame(game, Sport.COLLEGE_FOOTBALL);
    await prisma.game.update({
      where: {
        espnGameId_sport: { espnGameId: game.espnGameId, sport: Sport.COLLEGE_FOOTBALL },
      },
      data: { season },
    });
    count++;
  }
  return count;
}

export async function syncGamesForLeagueType(leagueType: LeagueType, season: number) {
  if (leagueType === LeagueType.NFL) {
    return syncNflGames(season);
  }
  if (leagueType === LeagueType.MLB) {
    return syncMlbGames(season);
  }
  return syncCollegeGames(season);
}

export async function updateGameScores(leagueType: LeagueType, season: number) {
  return syncGamesForLeagueType(leagueType, season);
}
