export const LEAGUE_TYPES = ["NFL", "MLB", "ACC", "SEC", "BIG_TEN"] as const;
export type LeagueTypeValue = (typeof LEAGUE_TYPES)[number];

export const CONFERENCES = ["NFL", "MLB", "ACC", "SEC", "BIG_TEN", "OTHER"] as const;
export type ConferenceValue = (typeof CONFERENCES)[number];
