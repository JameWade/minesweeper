import { useCallback, useEffect, useState } from "react";
import { SessionState } from "./useGameSession";
import { ethers } from "ethers";
import { useAccount, useWalletClient } from "wagmi";
import { GameState, Move } from "~~/components/minesweeper/types";
import { useScaffoldEventHistory, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

const INITIAL_BOARD_STATE: GameState = {
  board: Array(16)
    .fill(null)
    .map(() =>
      Array(16)
        .fill(null)
        .map(() => ({
          isMine: false,
          isRevealed: false,
          isFlagged: false,
          adjacentMines: 0,
        })),
    ),
  moveCount: 0,
  isOver: false,
  hasWon: false,
  startTime: 0,
  stateHash: "0x",
};

export const useGameBoard = ({ sessionState }: { sessionState: SessionState }) => {
  const [gameState, setGameState] = useState<GameState>(INITIAL_BOARD_STATE);
  const [pendingMoves, setPendingMoves] = useState<Move[]>([]);
  const [isProcessingMoves, setIsProcessingMoves] = useState(false);

  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { writeContractAsync } = useScaffoldWriteContract({
    contractName: "Minesweeper",
  });

  // 开始新游戏
  const startNewGame = useCallback(
    async (salt: string) => {
      try {
        await writeContractAsync({
          functionName: "startNewGame",
          args: [salt],
        });
      } catch (error) {
        notification.error("Failed to start new game");
      }
    },
    [writeContractAsync],
  );

  // 处理点击格子
  const handleCellClick = useCallback((x: number, y: number) => {
    console.log("Cell clicked:", x, y);
    setPendingMoves(prev => [...prev, { x, y }]);
  }, []);

  // 处理批量移动
  const processPendingMoves = useCallback(async () => {
    if (pendingMoves.length === 0) return;
    if (!walletClient) return;
    setIsProcessingMoves(true);
    try {
      const currentMoves = pendingMoves;
      const moves = currentMoves.slice(0, 20);
      const xCoords = moves.map(m => Number(m.x));
      const yCoords = moves.map(m => Number(m.y));
      console.log("address", address);
      console.log("xCoords", xCoords);
      console.log("yCoords", yCoords);
      console.log("nonce", sessionState.nonce);
      console.log("lastHash", sessionState.lastHash);
      const messageHash = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ["address", "uint8[]", "uint8[]", "bytes32", "bytes32"],
          [address, xCoords, yCoords, sessionState.nonce, sessionState.lastHash],
        ),
      );

      const signature = await walletClient.signMessage({
        account: walletClient.account,
        message: ethers.getBytes(messageHash),
      });

      await writeContractAsync({
        functionName: "processBatchMoves",
        args: [moves.map(m => ({ x: m.x, y: m.y })), signature],
      });
      setPendingMoves(prev => (prev === currentMoves ? prev.slice(moves.length) : prev));
    } catch (error) {
      console.error("Failed to process moves:", error);
      notification.error("Failed to process moves");
    } finally {
      setIsProcessingMoves(false);
    }
  }, [writeContractAsync, address, walletClient, sessionState]);

  // 监听游戏事件
  const { data: gameStartEvents } = useScaffoldEventHistory({
    contractName: "Minesweeper",
    eventName: "GameStarted",
    fromBlock: 0n,
    filters: { player: address },
    watch: true,
  });

  const { data: cellRevealedEvents } = useScaffoldEventHistory({
    contractName: "Minesweeper",
    eventName: "CellRevealed",
    fromBlock: 0n,
    filters: { player: address },
    watch: true,
  });

  const { data: gameOverEvents } = useScaffoldEventHistory({
    contractName: "Minesweeper",
    eventName: "GameOver",
    fromBlock: 0n,
    filters: { player: address },
    watch: true,
  });

  useEffect(() => {
    if (gameStartEvents && gameStartEvents.length > 0 && gameStartEvents[0].args) {
      const { player, boardHash } = gameStartEvents[0].args;
      if (player.toLowerCase() === address?.toLowerCase()) {
        // 打印棋盘哈希，用于调试
        console.log("Game started with board hash:", boardHash);
        // 打印棋盘布局
        console.log("Board layout:");
        const board = Array(16)
          .fill(false)
          .map(() => Array(16).fill(false));
        let mineCount = 0;
        for (let i = 0; i < 16; i++) {
          for (let j = 0; j < 16; j++) {
            // 按照合约逻辑计算每个格子是否是地雷
            const positionHash = ethers.keccak256(
              ethers.solidityPacked(["bytes32", "uint8", "uint8"], [boardHash, j, i]),
            );
            if (BigInt(positionHash) % 256n < 40n) {
              board[i][j] = true;
              mineCount++;
            }
          }
        }
        console.log(board.map(row => row.map(cell => (cell ? "💣" : "⬜️")).join("")).join("\n"));
        console.log("Total mines:", mineCount);
      }
    }
  }, [gameStartEvents, address]);

  useEffect(() => {
    if (cellRevealedEvents && cellRevealedEvents.length > 0) {
      cellRevealedEvents.forEach(event => {
        const { player, x, y, adjacentMines } = event.args;
        if (player.toLowerCase() === address?.toLowerCase()) {
          setGameState(prev => {
            const newBoard = [...prev.board];
            newBoard[y][x] = {
              isMine: false, // 如果是地雷，游戏就结束了，不会触发 CellRevealed
              isRevealed: true,
              isFlagged: false,
              adjacentMines,
            };
            return {
              ...prev,
              board: newBoard,
            };
          });
        }
      });
    }
  }, [cellRevealedEvents, address]);

  return {
    gameState,
    setGameState,
    pendingMoves,
    isProcessingMoves,
    startNewGame,
    handleCellClick,
    processPendingMoves,
  };
};
