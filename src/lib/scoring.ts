import { Game, Pick } from "@/generated/prisma/client";

export interface WeeklyScore {
  userId: string;
  username: string;
  name: string;
  correct: number;
  totalPicks: number;
}

export interface SeasonStanding {
  userId: string;
  username: string;
  name: string;
  weeklyWins: number;
  totalCorrect: number;
}

type PickWithGame = Pick & { game: Game };

export function getGameWinner(game: Game): "home" | "away" | null {
  if (game.winner === "home" || game.winner === "away") return game.winner;
  if (
    game.status.includes("final") &&
    game.awayScore != null &&
    game.homeScore != null &&
    game.awayScore !== game.homeScore
  ) {
    return game.awayScore > game.homeScore ? "away" : "home";
  }
  return null;
}

export function scorePick(pick: PickWithGame): number {
  const winner = getGameWinner(pick.game);
  if (!winner) return 0;
  return pick.pick === winner ? 1 : 0;
}

export function computeWeeklyScores(
  members: { userId: string; username: string; name: string }[],
  picks: PickWithGame[]
): WeeklyScore[] {
  const scores: WeeklyScore[] = members.map((m) => ({
    userId: m.userId,
    username: m.username,
    name: m.name,
    correct: 0,
    totalPicks: 0,
  }));

  const byUser = new Map(scores.map((s) => [s.userId, s]));

  for (const pick of picks) {
    const entry = byUser.get(pick.userId);
    if (!entry) continue;
    entry.totalPicks++;
    entry.correct += scorePick(pick);
  }

  return scores
    .filter((s) => s.totalPicks > 0)
    .sort((a, b) => b.correct - a.correct || a.username.localeCompare(b.username));
}

export function getWeeklyWinners(scores: WeeklyScore[]): WeeklyScore[] {
  if (scores.length === 0) return [];
  const maxCorrect = Math.max(...scores.map((s) => s.correct));
  if (maxCorrect === 0) return [];
  return scores.filter((s) => s.correct === maxCorrect);
}

export function computeSeasonStandings(
  members: { userId: string; username: string; name: string }[],
  weeklyScoresByWeek: Map<number, WeeklyScore[]>
): SeasonStanding[] {
  const standings = new Map<string, SeasonStanding>();

  for (const m of members) {
    standings.set(m.userId, {
      userId: m.userId,
      username: m.username,
      name: m.name,
      weeklyWins: 0,
      totalCorrect: 0,
    });
  }

  for (const scores of weeklyScoresByWeek.values()) {
    const winners = getWeeklyWinners(scores);
    for (const winner of winners) {
      const entry = standings.get(winner.userId);
      if (entry) entry.weeklyWins++;
    }
    for (const score of scores) {
      const entry = standings.get(score.userId);
      if (entry) entry.totalCorrect += score.correct;
    }
  }

  return Array.from(standings.values()).sort(
    (a, b) =>
      b.weeklyWins - a.weeklyWins ||
      b.totalCorrect - a.totalCorrect ||
      a.username.localeCompare(b.username)
  );
}

export function isWeekComplete(games: Game[]) {
  if (games.length === 0) return false;
  return games.every(
    (g) =>
      getGameWinner(g) !== null ||
      (g.status.includes("final") && g.awayScore != null && g.homeScore != null && g.awayScore === g.homeScore)
  );
}
