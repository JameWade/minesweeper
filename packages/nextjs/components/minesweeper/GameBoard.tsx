import { GameState, SessionState } from "./types";
import { MinesweeperBoard } from "./MinesweeperBoard";
import { getRandomBytes } from "~~/utils/scaffold-eth";

interface GameBoardProps {
  gameState: GameState;
  sessionState: SessionState;
  pendingMoves: { x: number; y: number }[];
  isProcessingMoves: boolean;
  onCellClick: (x: number, y: number) => void;
  onCellRightClick: (x: number, y: number) => void;
  onProcessMoves: () => void;
  startNewGame: (salt: string) => void;
}

export const GameBoard = ({
  gameState,
  sessionState,
  pendingMoves,
  isProcessingMoves,
  onCellClick,
  onCellRightClick,
  onProcessMoves,
  startNewGame,
}: GameBoardProps) => {
  if (gameState.isOver) {
    return (
      <div className="alert alert-info">
        <span>{gameState.hasWon ? `Congratulations! Score: ${gameState.score}` : "Game Over! Try again?"}</span>
        <button className="btn btn-primary" onClick={() => startNewGame(getRandomBytes())}>
          New Game
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col items-center gap-4">
        <button className="btn btn-secondary" onClick={() => startNewGame(getRandomBytes())}>
          Restart Game
        </button>
        <MinesweeperBoard board={gameState.board} onCellClick={onCellClick} onCellRightClick={onCellRightClick} />
        {pendingMoves.length > 0 && sessionState.isActive && (
          <button className="btn btn-secondary" onClick={onProcessMoves} disabled={isProcessingMoves}>
            Process Moves ({pendingMoves.length})
          </button>
        )}
      </div>
    </>
  );
}; 