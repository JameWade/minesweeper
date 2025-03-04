import { useEffect } from "react";
import { useGameBoard } from "./useGameBoard";
import { useGameSession } from "./useGameSession";

export const useMinesweeper = () => {
  const { sessionState, setSessionState, createSession } = useGameSession();

  const {
    gameState,
    setGameState,
    pendingMoves,
    isProcessingMoves,
    startNewGame,
    handleCellClick,
    processPendingMoves,
  } = useGameBoard({ sessionState, setSessionState });

  // 自动处理待处理的移动
  useEffect(() => {
    if (isProcessingMoves) return;  // 如果正在处理，就不要再触发
    if (pendingMoves.length >= 5 && !isProcessingMoves) {
      processPendingMoves();
    }
  }, [pendingMoves, isProcessingMoves, processPendingMoves]);

  return {
    gameState,
    sessionState,
    pendingMoves,
    isProcessingMoves,
    createSession,
    startNewGame,
    handleCellClick,
    handleCellRightClick: (e: React.MouseEvent, x: number, y: number) => {
      e.preventDefault();
      setGameState(prev => {
        const newBoard = [...prev.board];
        newBoard[y][x] = {
          ...newBoard[y][x],
          isFlagged: !newBoard[y][x].isFlagged
        };
        return {
          ...prev,
          board: newBoard
        };
      });
    },
    processPendingMoves,
  };
};
