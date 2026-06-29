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

export function isGameCancelledOrPostponed(status: string): boolean {
  const s = status.toLowerCase();
  return s.includes("cancel") || s.includes("postpon") || s.includes("suspended");
}

export function isGameFinished(game: Game): boolean {
  if (isGameCancelledOrPostponed(game.status)) return true;
  if (getGameWinner(game) !== null) return true;
  return (
    game.status.includes("final") &&
    game.awayScore != null &&
    game.homeScore != null &&
    game.homeScore === game.awayScore
  );
}

export function isWeekComplete(games: Game[]) {
  if (games.length === 0) return false;

  const scheduledGames = games.filter((g) => !isGameCancelledOrPostponed(g.status));
  if (scheduledGames.length === 0) return true;

  const lastGame = scheduledGames.reduce((latest, game) =>
    game.kickoff > latest.kickoff ? game : latest
  );

  return isGameFinished(lastGame);
}

export function getUniquePickedGames(picks: PickWithGame[]): Game[] {
  const games = new Map<string, Game>();
  for (const pick of picks) {
    games.set(pick.game.id, pick.game);
  }
  return Array.from(games.values());
}

export function isWeekCompleteForPickedGames(picks: PickWithGame[]) {
  return isWeekComplete(getUniquePickedGames(picks));
}
