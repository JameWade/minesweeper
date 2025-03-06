import { useCallback, useEffect, useState } from "react";
import { useScaffoldReadContract } from "./scaffold-eth";

interface LeaderboardEntry {
  address: string;
  score: number;
}

export const useLeaderboard = () => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);

  // 获取所有玩家地址
  const { data: players } = useScaffoldReadContract({
    contractName: "Minesweeper",
    functionName: "getPlayers",
  });

  // 获取所有玩家分数
  const { data: scores } = useScaffoldReadContract({
    contractName: "Minesweeper",
    functionName: "getScores",
    args: [players || []],
  });

  // 更新排行榜
  const updateLeaderboard = useCallback(() => {
    if (!players || !scores) return;

    const leaderboardEntries: LeaderboardEntry[] = players.map((address, index) => ({
      address: address as string,
      score: Number(scores[index] || 0),
    }));

    // 按分数降序排序
    leaderboardEntries.sort((a, b) => b.score - a.score);
    setEntries(leaderboardEntries);
  }, [players, scores]);

  useEffect(() => {
    updateLeaderboard();
  }, [updateLeaderboard]);

  return { entries };
};
