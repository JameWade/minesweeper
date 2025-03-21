export interface Cell {
  isMine: boolean;
  isRevealed: boolean;
  isFlagged: boolean;
  adjacentMines: number;
}

export interface GameState {
  board: Cell[][];
  moveCount: number;
  isOver: boolean;
  hasWon: boolean;
  startTime: number;
  stateHash: string;
  score: number;
  mineCount: number;
}

export interface Move {
  x: number;
  y: number;
}

export interface SessionState {
  isActive: boolean;
  expiryTime: number;
  nonce: string;
  lastHash: string;
  stake: bigint;
  createdAt: number;
}

export interface LeaderboardEntry {
  address: string;
  score: number;
  timestamp: number;
}
