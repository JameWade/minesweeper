import { SessionState } from "~~/components/minesweeper/types";

interface GameStatusProps {
  sessionState: SessionState;
}

export const GameStatus = ({ sessionState }: GameStatusProps) => {
  return (
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
  );
}; 