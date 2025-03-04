import { useEffect } from "react";
import { useMinesweeper } from "~~/hooks/useMinesweeper";
import { getRandomBytes } from "~~/utils/scaffold-eth";
import { MinesweeperBoard } from "./MinesweeperBoard";


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

  return (
    <div className="flex flex-col items-center gap-4">
      {!sessionState.isActive ? (
        <button className="btn btn-primary" onClick={createSession}>
          Create Session (1 ETH)
        </button>
      ) : (
        <>
          {!gameState.startTime ? (
            <button className="btn btn-primary" onClick={() => startNewGame(getRandomBytes())}>
              Start Game
            </button>
          ) : (
            <div className="stats shadow">
              <div className="stat">
                <div className="stat-title">Session Expires In</div>
                <div className="stat-value">
                  {Math.max(0, Math.floor((sessionState.expiryTime - Date.now() / 1000) / 60))}m
                </div>
              </div>
              <div className="stat">
                <div className="stat-title">Remaining Gas</div>
                <div className="stat-value text-secondary">{sessionState.remainingGas}</div>
              </div>
            </div>
          )}

          {gameState.isOver ? (
            <div className="alert alert-info">
              <span>{gameState.hasWon ? `Congratulations! Score: ${gameState.score}` : "Game Over! Try again?"}</span>
              <button className="btn btn-primary" onClick={() => startNewGame(getRandomBytes())}>
                New Game
              </button>
            </div>
          ) : (
            <>
              <MinesweeperBoard
                board={gameState.board}
                onCellClick={handleCellClick}
                onCellRightClick={handleCellRightClick}
              />
              {pendingMoves.length > 0 && sessionState.isActive && (
                <button className="btn btn-secondary" onClick={processPendingMoves} disabled={isProcessingMoves}>
                  Process Moves ({pendingMoves.length})
                </button>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};