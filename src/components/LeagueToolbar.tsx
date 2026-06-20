import { FetchScoresButton } from "./FetchScoresButton";
import { LeagueMembershipActions } from "./LeagueMembershipActions";
import { LeagueSettings } from "./LeagueSettings";

export function LeagueToolbar({
  leagueId,
  week,
  isCommissioner,
  isPublic,
}: {
  leagueId: string;
  week: number;
  isCommissioner: boolean;
  isPublic: boolean;
}) {
  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap items-start justify-end gap-2">
        <FetchScoresButton leagueId={leagueId} week={week} />
        {isCommissioner ? (
          <LeagueSettings leagueId={leagueId} isPublic={isPublic} />
        ) : (
          <LeagueMembershipActions leagueId={leagueId} />
        )}
      </div>
    </div>
  );
}
