import { Conference } from "@/generated/prisma/client";
import { ESPN_CONFERENCE_GROUPS } from "@/lib/constants";

const ESPN_GROUP_ID_TO_CONFERENCE: Record<string, Conference> = Object.fromEntries(
  Object.entries(ESPN_CONFERENCE_GROUPS).map(([leagueType, groupId]) => [
    String(groupId),
    mapLeagueTypeToConference(leagueType),
  ])
) as Record<string, Conference>;

function mapLeagueTypeToConference(leagueType: string): Conference {
  switch (leagueType) {
    case "ACC":
      return Conference.ACC;
    case "SEC":
      return Conference.SEC;
    case "BIG_TEN":
      return Conference.BIG_TEN;
    default:
      return Conference.OTHER;
  }
}

const ESPN_CONFERENCE_MAP: Record<string, Conference> = {
  nfl: Conference.NFL,
  mlb: Conference.MLB,
  "major league baseball": Conference.MLB,
  acc: Conference.ACC,
  "atlantic coast": Conference.ACC,
  sec: Conference.SEC,
  "southeastern": Conference.SEC,
  "big ten": Conference.BIG_TEN,
  "big 10": Conference.BIG_TEN,
  b1g: Conference.BIG_TEN,
  big_ten: Conference.BIG_TEN,
};

export function mapEspnConferenceId(id: string | null | undefined): Conference | null {
  if (!id) return null;
  return ESPN_GROUP_ID_TO_CONFERENCE[String(id)] ?? null;
}

export function mapEspnConference(name: string | null | undefined): Conference {
  if (!name) return Conference.OTHER;
  const key = name.toLowerCase().trim();
  if (ESPN_CONFERENCE_MAP[key]) return ESPN_CONFERENCE_MAP[key];
  for (const [pattern, conf] of Object.entries(ESPN_CONFERENCE_MAP)) {
    if (key.includes(pattern)) return conf;
  }
  return Conference.OTHER;
}

export function conferenceMatchesLeague(
  conference: Conference,
  leagueConference: Conference
) {
  if (leagueConference === Conference.NFL) {
    return conference === Conference.NFL;
  }
  if (leagueConference === Conference.MLB) {
    return conference === Conference.MLB;
  }
  return conference === leagueConference;
}
