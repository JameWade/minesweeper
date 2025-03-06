import { useEffect, useState } from "react";
import { useMinesweeper } from "~~/hooks/useMinesweeper";
import { getRandomBytes } from "~~/utils/scaffold-eth";
import { GameBoard } from "./GameBoard";
import { GameStatus } from "./GameStatus";
import { Leaderboard } from "./Leaderboard";
import { parseEther } from "viem";

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

  const [inputAmount, setInputAmount] = useState("0.01");

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
  }, [pendingMoves.length, isProcessingMoves, gameState.isOver, processPendingMoves]); 

  const isSessionExpired = sessionState.expiryTime < Date.now() / 1000;
  const isSessionValid = sessionState.isActive && !isSessionExpired;

  if (!isSessionValid) {
    return (
      <div className="flex items-center gap-2">
        <input
          type="number"
          step="0.01"
          min="0.01"
          value={inputAmount}
          onChange={e => setInputAmount(e.target.value)}
          className="input input-bordered w-24"
        />
        <span className="text-sm">ETH</span>
        <button className="btn btn-primary" onClick={() => createSession(parseEther(inputAmount))}>
          Create Session
        </button>
      </div>
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