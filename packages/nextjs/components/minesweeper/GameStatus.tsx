import { useEffect, useState } from "react";
import { GameState, Move } from "./types";

interface GameStatusProps {
  gameState: GameState;
  pendingMoves: Move[];
  isProcessingMoves: boolean;
}

export const GameStatus = ({ gameState, pendingMoves, isProcessingMoves }: GameStatusProps) => {
  const [gameTime, setGameTime] = useState(0);

  useEffect(() => {
    if (!gameState.startTime) {
      return;
    }

    const timer = setInterval(() => {
      setGameTime(Math.max(0, Math.floor(Date.now() / 1000 - gameState.startTime)));
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState.startTime]);

  if (!gameState.stateHash) {
    return null;
  }

  return (
    <div className="stats shadow h-12">
      <div className="stat py-1">
        <div className="stat-title text-xs">Mines</div>
        <div className="stat-value text-secondary text-lg leading-none">
          {gameState.mineCount}
        </div>
      </div>
      <div className="stat py-1">
        <div className="stat-title text-xs">Time</div>
        <div className="stat-value text-secondary text-lg leading-none">
          {gameTime}s
        </div>
      </div>
    </div>
  );
};
