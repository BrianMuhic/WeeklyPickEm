import type { ConferenceValue, LeagueTypeValue } from "@/lib/types";

export const LEAGUE_TYPE_LABELS: Record<LeagueTypeValue, string> = {
  NFL: "NFL",
  MLB: "MLB",
  ACC: "ACC",
  SEC: "SEC",
  BIG_TEN: "Big Ten",
};

export const LEAGUE_TYPE_TO_CONFERENCE: Record<LeagueTypeValue, ConferenceValue> = {
  NFL: "NFL",
  MLB: "MLB",
  ACC: "ACC",
  SEC: "SEC",
  BIG_TEN: "BIG_TEN",
};

// ESPN college football conference group IDs
export const ESPN_CONFERENCE_GROUPS: Record<Exclude<LeagueTypeValue, "NFL" | "MLB">, number> = {
  ACC: 1,
  SEC: 8,
  BIG_TEN: 5,
};

export const NFL_REGULAR_SEASON_WEEKS = 18;
export const MLB_REGULAR_SEASON_WEEKS = 28;
export const COLLEGE_REGULAR_SEASON_WEEKS = 15;

export function maxWeeksForLeague(leagueType: LeagueTypeValue) {
  if (leagueType === "NFL") return NFL_REGULAR_SEASON_WEEKS;
  if (leagueType === "MLB") return MLB_REGULAR_SEASON_WEEKS;
  return COLLEGE_REGULAR_SEASON_WEEKS;
}

export function currentSeasonYear() {
  const now = new Date();
  const year = now.getFullYear();
  // Jan–Feb: prior season (bowls/playoffs). Mar–Dec: season kicking off that calendar year.
  return now.getMonth() >= 2 ? year : year - 1;
}
