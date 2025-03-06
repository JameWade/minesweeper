import { useEffect } from "react";
import { useGameBoard } from "./useGameBoard";
import { useGameSession } from "./useGameSession";
import { useLeaderboard } from './useLeaderboard';

export const useMinesweeper = () => {
  const { sessionState, setSessionState, createSession, closeSession } = useGameSession();
  const { entries: leaderboardEntries } = useLeaderboard();

  const {
    gameState,
    setGameState,
    pendingMoves,
    isProcessingMoves,
    startNewGame,
    handleCellClick,
    handleCellRightClick,
    processPendingMoves,
  } = useGameBoard({ sessionState, setSessionState });

  return {
    gameState,
    sessionState,
    pendingMoves,
    isProcessingMoves,
    createSession,
    closeSession,
    startNewGame,
    handleCellClick,
    handleCellRightClick,
    processPendingMoves,
    leaderboardEntries,
  };
};
