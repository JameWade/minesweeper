import { useGameBoard } from "./useGameBoard";
import { useLeaderboard } from './useLeaderboard';

export const useMinesweeper = () => {
  const { entries: leaderboardEntries } = useLeaderboard();

  const {
    gameState,
    pendingMoves,
    isProcessingMoves,
    startNewGame,
    handleCellClick,
    handleCellRightClick,
    processPendingMoves,
  } = useGameBoard();

  return {
    gameState,
    pendingMoves,
    isProcessingMoves,
    startNewGame,
    handleCellClick,
    handleCellRightClick,
    processPendingMoves,
    leaderboardEntries,
  };
};
