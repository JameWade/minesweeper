
interface LeaderboardEntry {
  address: string;
  score: number;
}

interface LeaderboardProps {
  entries: LeaderboardEntry[];
}

export const Leaderboard = ({ entries }: LeaderboardProps) => {
  return (
    <div className="bg-base-200 p-4 rounded-lg shadow-lg">
      <h2 className="text-xl font-bold mb-4">🏆 Leaderboard</h2>
      {entries.length === 0 ? (
        <div className="text-center text-gray-500">No scores yet</div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry, index) => (
            <div key={entry.address} className="flex justify-between items-center p-2 bg-base-100 rounded">
              <div className="flex items-center gap-2">
                <span className="font-bold">{index + 1}.</span>
                <span>{entry.address}</span>
              </div>
              <span className="font-mono">{entry.score}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}; 