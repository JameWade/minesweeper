export * from "./fetchPriceFromUniswap";
export * from "./networks";
export * from "./notification";
export * from "./decodeTxData";
export * from "./getParsedError";
import { ethers } from "ethers";
export const getRandomBytes = () => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return (
    "0x" +
    Array.from(array)
      .map(b => b.toString(16).padStart(2, "0"))
      .join("")
  );
};
export const isMine = (boardHash: string, x: number, y: number): boolean => {
  const positionHash = ethers.solidityPackedKeccak256(["bytes32", "uint8", "uint8"], [boardHash, x, y]);

  const hashValue = BigInt(positionHash);
  const maxMinePositions = BigInt(16 * 16);
  return hashValue % maxMinePositions < BigInt(40);
};

export const getAdjacentMines = (boardHash: string, x: number, y: number): number => {
  let count = 0;
  // 检查周围8个格子
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const newX = x + dx;
      const newY = y + dy;
      // 确保坐标在棋盘范围内
      if (newX >= 0 && newX < 16 && newY >= 0 && newY < 16) {
        if (isMine(boardHash, newX, newY)) {
          count++;
        }
      }
    }
  }
  return count;
};