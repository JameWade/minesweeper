import { useEffect } from "react";
import { useMinesweeper } from "~~/hooks/useMinesweeper";
import { getRandomBytes } from "~~/utils/scaffold-eth";
import { GameBoard } from "./GameBoard";
import { GameStatus } from "./GameStatus";

export const MinesweeperGame = () => {
  const {
    gameState,
    sessionState,
    pendingMoves,
    isProcessingMoves,
    createSession,
    startNewGame,
    handleCellClick,
    handleCellRightClick,
    processPendingMoves,
  } = useMinesweeper();

  // 自动处理待处理的移动
  useEffect(() => {
    if (pendingMoves.length >= 5 && !isProcessingMoves) {
      processPendingMoves();
    }
  }, [pendingMoves, isProcessingMoves, processPendingMoves]);

  const isSessionExpired = sessionState.expiryTime < Date.now() / 1000;

  if (!sessionState.isActive || isSessionExpired) {
    return (
      <button className="btn btn-primary" onClick={createSession}>
        Create Session (1 ETH)
      </button>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <GameStatus sessionState={sessionState} onCreateSession={createSession} />
      {!gameState.stateHash ? (
        <div className="flex flex-col items-center gap-4">
          <div className="alert alert-info">
            <span>Start a new game to begin playing!</span>
          </div>
          <button className="btn btn-primary" onClick={() => startNewGame(getRandomBytes())}>
            Start Game
          </button>
        </div>
      ) : (
        <GameBoard
          gameState={gameState}
          sessionState={sessionState}
          pendingMoves={pendingMoves}
          isProcessingMoves={isProcessingMoves}
          onCellClick={handleCellClick}
          onCellRightClick={handleCellRightClick}
          onProcessMoves={processPendingMoves}
          startNewGame={startNewGame}
        />
      )}
    </div>
  );
};