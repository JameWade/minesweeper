import { useEffect, useState } from "react";
import { SessionState } from "~~/components/minesweeper/types";
import { GameState, Move } from "./types";

interface SessionStatusProps {
  sessionState: SessionState;
  onCloseSession?: () => void;
}

interface GameStatusProps {
  gameState: GameState;
  pendingMoves: Move[];
  isProcessingMoves: boolean;
}

export const SessionStatus = ({ sessionState, onCloseSession }: SessionStatusProps) => {
  const isExpired = sessionState.expiryTime < Date.now() / 1000;

  if (isExpired) {
    return (
      <div className="alert alert-warning">
        <span>Session Expired!</span>
      </div>
    );
  }

  return (
    <div className="stats shadow h-12">
      <div className="stat py-1">
        <div className="stat-title text-xs">Session Expires In</div>
        <div className="stat-value text-secondary text-lg leading-none">
          {Math.max(0, Math.floor((sessionState.expiryTime - Date.now() / 1000) / 60))}m
        </div>
      </div>
      {sessionState.isActive && !isExpired && onCloseSession && (
        <div className="stat py-1">
          <button className="btn btn-primary btn-sm" onClick={onCloseSession}>
            Close Session
          </button>
        </div>
      )}
    </div>
  );
};

export const GameStatus = ({ gameState, pendingMoves, isProcessingMoves }: GameStatusProps) => {
  if (!gameState.stateHash) {
    return null;
  }

  const [gameTime, setGameTime] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setGameTime(Math.floor(Date.now() / 1000 - gameState.startTime));
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState.startTime]);

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
