import { SessionState } from "~~/components/minesweeper/types";

interface GameStatusProps {
  sessionState: SessionState;
  onCreateSession?: () => void;
}

export const GameStatus = ({ sessionState, onCreateSession }: GameStatusProps) => {
  const isExpired = sessionState.expiryTime < Date.now() / 1000;

  if (isExpired) {
    return (
      <div className="alert alert-warning">
        <span>Session Expired!</span>
        {onCreateSession && (
          <button className="btn btn-primary" onClick={onCreateSession}>
            Create New Session (1 ETH)
          </button>
        )}
      </div>
    );
  }

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