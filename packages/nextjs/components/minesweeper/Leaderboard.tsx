import { LeaderboardEntry } from './types';

interface LeaderboardProps {
  entries: LeaderboardEntry[];
}

export const Leaderboard = ({ entries }: LeaderboardProps) => {
  return (
    <div className="bg-base-200 rounded-box p-4">
      <h2 className="text-xl font-bold mb-4">Top Players</h2>
      <div className="overflow-x-auto">
        <table className="table w-full">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Player</th>
              <th>Score</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, index) => (
              <tr key={index}>
                <td>{index + 1}</td>
                <td>{entry.address.slice(0, 6)}...{entry.address.slice(-4)}</td>
                <td>{entry.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}; 