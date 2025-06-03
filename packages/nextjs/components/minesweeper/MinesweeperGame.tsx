import { useEffect, useState } from "react";
import { useMinesweeper } from "~~/hooks/useMinesweeper";
import { getRandomBytes } from "~~/utils/scaffold-eth";
import { GameBoard } from "./GameBoard";
import { GameStatus } from "./GameStatus";
import { Leaderboard } from "./Leaderboard";
import { NFTMint } from "./NFTMint";
import { notification } from "~~/utils/scaffold-eth";
import GameTips from "./GameGuide";

export const MinesweeperGame = () => {
  const {
    gameState,
    pendingMoves,
    isProcessingMoves,
    startNewGame,
    handleCellClick,
    handleCellRightClick,
    processPendingMoves,
    leaderboardEntries,
  } = useMinesweeper();

  const [score, setScore] = useState(0);

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

  // 监听游戏结束
  useEffect(() => {
    if (gameState.isOver) {
      if (gameState.hasWon) {
        notification.success(
          `🎉 恭喜！你赢了！得分：${gameState.score}`,
          { duration: 2000 }
        );
        setScore(gameState.score);
      } else {
        notification.error(
          "💥 游戏结束！你踩到地雷了！",
          { duration: 2000 }
        );
      }
    }
  }, [gameState.isOver, gameState.hasWon, gameState.score]);


  return (
    <div className="flex gap-8 justify-center items-start">
      {/* 游戏说明 */}
      <GameTips />
      
      {/* 中间棋盘 */}
      <div>
        <GameStatus 
          gameState={gameState}
          pendingMoves={pendingMoves}
          isProcessingMoves={isProcessingMoves}
        />
        {(
          <GameBoard
            gameState={gameState}
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
            <button 
              className="btn btn-primary w-full" 
              onClick={() => {
                const salt = getRandomBytes();
                console.log('Generated salt:', salt);
                startNewGame(salt);
              }}
            >
              Start Game
            </button>
          </div>
        ) : (
          <button className="btn btn-primary w-full" onClick={
            () => {
              const salt = getRandomBytes();
              console.log('Generated salt:', salt);
              startNewGame(salt);
            }
            }>
            Restart Game
          </button>
        )}
        <Leaderboard entries={leaderboardEntries} />
        <NFTMint leaderboardEntries={leaderboardEntries} />
      </div>
    </div>
  );
};