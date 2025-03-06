import { useEffect, useState } from "react";
import { LeaderboardEntry } from "../components/minesweeper/types";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";

export const useLeaderboard = () => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);

  // 1. 获取所有玩家列表
  const { data: players } = useScaffoldReadContract({
    contractName: "Minesweeper",
    functionName: "getPlayers",
  });

  // 2. 一次性获取所有玩家的分数
  const { data: scores } = useScaffoldReadContract({
    contractName: "Minesweeper",
    functionName: "getScores",
    args: [players],
  });

  useEffect(() => {
    if (!players || !scores) return;

    const newEntries = players.map((player, i) => ({
      address: player,
      score: Number(scores[i]),
      timestamp: Date.now(),
    }));

    newEntries.sort((a, b) => b.score - a.score);
    setEntries(newEntries);
  }, [players, scores]);

  return entries;
};
