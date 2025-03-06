import { useEffect } from "react";
import { useMinesweeper } from "~~/hooks/useMinesweeper";
import { getRandomBytes } from "~~/utils/scaffold-eth";
import { GameBoard } from "./GameBoard";
import { GameStatus } from "./GameStatus";
import { Leaderboard } from "./Leaderboard";

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
    closeSession,
    leaderboardEntries,
  } = useMinesweeper();

  // 自动处理待处理的移动
  useEffect(() => {
    const shouldProcess =
      pendingMoves.length >= 5 && // 有足够的移动
      !isProcessingMoves && // 不在处理中
      !gameState.isOver; // 游戏未结束

    let timeoutId: NodeJS.Timeout;

    if (shouldProcess) {
      // 添加一个小延迟，让用户有机会继续点击
      timeoutId = setTimeout(() => {
        processPendingMoves();
      }, 1000);
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [pendingMoves.length, isProcessingMoves, gameState.isOver, processPendingMoves]); // 注意这里使用 pendingMoves.length

  const isSessionExpired = sessionState.expiryTime < Date.now() / 1000;
  const isSessionValid = sessionState.isActive && !isSessionExpired;

  if (!isSessionValid) {
    return (
      <button className="btn btn-primary" onClick={createSession}>
        Create Session (0.01 ETH)
      </button>
    );
  }

  return (
    <div className="flex gap-8 justify-center items-start">
      {/* 左侧棋盘 */}
      <div>
        {gameState.stateHash && (
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

      {/* 右侧控制和排行榜 */}
      <div className="flex flex-col gap-4 w-80">
        {!gameState.stateHash ? (
          <div className="flex flex-col items-center gap-4">
            <div className="alert alert-info">
              <span>Start a new game to begin playing!</span>
            </div>
            <button className="btn btn-primary w-full" onClick={() => startNewGame(getRandomBytes())}>
              Start Game
            </button>
          </div>
        ) : (
          <button className="btn btn-primary w-full" onClick={() => startNewGame(getRandomBytes())}>
            Restart Game
          </button>
        )}
        <Leaderboard entries={leaderboardEntries} />
      </div>
    </div>
  );
};