import { useState, useCallback, useEffect } from 'react';
import { LeaderboardEntry } from '~~/components/minesweeper/types';

export const useLeaderboard = () => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);

  // 从合约获取排行榜数据
  const fetchLeaderboard = useCallback(async () => {
    // 临时使用模拟数据
    setEntries([
      { address: "0x1234...5678", score: 100, timestamp: Date.now() },
      { address: "0xabcd...efgh", score: 90, timestamp: Date.now() },
    ]);
  }, []);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  return {
    entries,
    refreshLeaderboard: fetchLeaderboard,
  };
}; 