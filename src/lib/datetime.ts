/** US Eastern — standard display timezone for NFL and college kickoffs. */
export const GAME_TIMEZONE = "America/New_York";

const gameDateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: GAME_TIMEZONE,
  weekday: "short",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZoneName: "short",
});

export function formatGameDateTime(date: Date | string): string {
  const value = typeof date === "string" ? new Date(date) : date;
  return gameDateTimeFormatter.format(value);
}
