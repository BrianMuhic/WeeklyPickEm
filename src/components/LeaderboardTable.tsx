export function WeeklyLeaderboard({
  rows,
  weekComplete = false,
  winnerUsernames = [],
}: {
  rows: { username: string; name: string; correct: number; totalPicks: number }[];
  weekComplete?: boolean;
  winnerUsernames?: string[];
}) {
  if (rows.length === 0) {
    return <p className="muted">No picks submitted yet for this week.</p>;
  }

  const winners = new Set(winnerUsernames);

  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>Rank</th>
          <th>Player</th>
          <th>Correct</th>
          <th>Picks</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr
            key={row.username}
            className={weekComplete && winners.has(row.username) ? "leaderboard-row-winner" : undefined}
          >
            <td>{i + 1}</td>
            <td>
              <strong>@{row.username}</strong>
              <span className="muted ml-2 text-sm">{row.name}</span>
            </td>
            <td>{row.correct}</td>
            <td>{row.totalPicks}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function SeasonLeaderboard({
  rows,
}: {
  rows: { username: string; name: string; weeklyWins: number; totalCorrect: number }[];
}) {
  if (rows.length === 0) {
    return <p className="muted">No season data yet.</p>;
  }

  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>Rank</th>
          <th>Player</th>
          <th>Weekly Wins</th>
          <th>Total Correct</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={row.username}>
            <td>{i + 1}</td>
            <td>
              <strong>@{row.username}</strong>
              <span className="muted ml-2 text-sm">{row.name}</span>
            </td>
            <td>{row.weeklyWins}</td>
            <td>{row.totalCorrect}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
