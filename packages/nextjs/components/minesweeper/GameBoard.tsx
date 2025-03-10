import { GameState } from "./types";
import { MinesweeperBoard } from "./MinesweeperBoard";
import { getRandomBytes } from "~~/utils/scaffold-eth";

interface GameBoardProps {
  gameState: GameState;
  pendingMoves: { x: number; y: number }[];
  isProcessingMoves: boolean;
  onCellClick: (x: number, y: number) => void;
  onCellRightClick: (x: number, y: number) => void;
  onProcessMoves: () => void;
  startNewGame: (salt: string) => void;
}

export const GameBoard = ({
  gameState,
  pendingMoves,
  isProcessingMoves,
  onCellClick,
  onCellRightClick,
  onProcessMoves,
  startNewGame,
}: GameBoardProps) => {
  return (
    <>
      <div className="flex flex-col items-center gap-4">
        <MinesweeperBoard board={gameState.board} onCellClick={onCellClick} onCellRightClick={onCellRightClick} />
        {pendingMoves.length > 0 && (
          <button className="btn btn-secondary" onClick={onProcessMoves} disabled={isProcessingMoves}>
            Process Moves ({pendingMoves.length})
          </button>
        )}
      </div>

      {/* 游戏结束弹窗 */}
      {gameState.isOver && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-base-200 p-6 rounded-2xl max-w-sm w-full mx-4">
            <h3 className="text-2xl font-bold mb-4 text-center">
              {gameState.hasWon ? (
                <span className="bg-gradient-to-r from-purple-500 to-purple-300 bg-clip-text text-transparent">
                  Congratulations!
                </span>
              ) : (
                "Game Over!"
              )}
            </h3>
            {gameState.hasWon && (
              <p className="text-center mb-4">
                Score: <span className="text-purple-400 font-bold">{gameState.score}</span>
              </p>
            )}
            <div className="flex justify-center">
              <button className="btn btn-primary" onClick={() => startNewGame(getRandomBytes())}>
                New Game
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
