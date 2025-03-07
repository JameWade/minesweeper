interface LeaderboardEntry {
  address: string;
  score: number;
}

interface LeaderboardProps {
  entries: LeaderboardEntry[];
}

export const Leaderboard = ({ entries }: LeaderboardProps) => {
  return (
    <div className="bg-purple-600/20 p-4 rounded-2xl backdrop-blur-sm">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        🏆 <span className="bg-gradient-to-r from-purple-500 to-purple-300 bg-clip-text text-transparent">Leaderboard</span>
      </h2>
      {entries.length === 0 ? (
        <div className="text-center text-gray-500">No scores yet</div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry, index) => (
            <div 
              key={entry.address} 
              className="flex justify-between items-center p-3 bg-purple-500/10 rounded-xl hover:bg-purple-500/20 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="font-bold text-purple-300">#{index + 1}</span>
                <span className="text-gray-300">
                  {entry.address.slice(0, 6)}...{entry.address.slice(-4)}
                </span>
              </div>
              <span className="font-mono text-purple-200">{entry.score}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}; 