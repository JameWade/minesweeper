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
  remainingGas: number;
  stake: bigint;
}
