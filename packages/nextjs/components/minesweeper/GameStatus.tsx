import { SessionState } from "~~/components/minesweeper/types";

interface GameStatusProps {
  sessionState: SessionState;
  onCreateSession?: () => void;
  onCloseSession?: () => void;
}

export const GameStatus = ({ sessionState, onCreateSession, onCloseSession }: GameStatusProps) => {
  const isExpired = sessionState.expiryTime < Date.now() / 1000;

  if (isExpired) {
    return (
      <div className="alert alert-warning">
        <span>Session Expired!</span>
        {onCreateSession && (
          <button className="btn btn-primary" onClick={onCreateSession}>
            Create New Session (0.01 ETH)
          </button>
        )}
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
      <div className="stat py-1">
        <div className="stat-title text-xs">Remaining Gas</div>
        <div className="stat-value text-secondary text-lg leading-none">{sessionState.remainingGas}</div>
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
