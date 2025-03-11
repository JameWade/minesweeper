import { useCallback, useEffect, useState } from "react";
import { ethers } from "ethers";
import { useAccount, useWalletClient } from "wagmi";
import { GameState, Move, SessionState } from "~~/components/minesweeper/types";
import { useScaffoldEventHistory, useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
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
  stateHash: "",
  score: 0,
  mineCount: 0 
};

export const useGameBoard = ({
  sessionState,
  setSessionState,
}: {
  sessionState: SessionState;
  setSessionState: (state: SessionState) => void;
}) => {
  const [gameState, setGameState] = useState<GameState>(INITIAL_BOARD_STATE);
  const [pendingMoves, setPendingMoves] = useState<Move[]>([]);
  const [isProcessingMoves, setIsProcessingMoves] = useState(false);
  const [gameStartBlock, setGameStartBlock] = useState<bigint>(0n);

  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { writeContractAsync } = useScaffoldWriteContract({
    contractName: "Minesweeper",
  });

  const { data: gameStartEvents } = useScaffoldEventHistory({
    contractName: "Minesweeper",
    eventName: "GameStarted",
    fromBlock: gameStartBlock,
    filters: { player: address },
    watch: true,
  });

  const { data: cellRevealedEvents } = useScaffoldEventHistory({
    contractName: "Minesweeper",
    eventName: "CellRevealed",
    fromBlock: gameStartBlock,
    filters: { player: address },
    watch: true,
  });

  const { data: gameOverEvents } = useScaffoldEventHistory({
    contractName: "Minesweeper",
    eventName: "GameOver",
    fromBlock: gameStartBlock,
    filters: { player: address },
    watch: true,
  });

  const { data: contractSession } = useScaffoldReadContract({
    contractName: "Minesweeper",
    functionName: "sessions",
    args: [address],
  });

  const startNewGame = useCallback(
    async (salt: string) => {
      if (!address) {
        notification.error("Please connect your wallet");
        return;
      }

      try {
        // 重置游戏状态
        setGameState(INITIAL_BOARD_STATE);
        setPendingMoves([]);

        await writeContractAsync({
          functionName: "startNewGame",
          args: [salt as `0x${string}`],
        });
      } catch (error) {
        console.error("Failed to start new game:", error);
        notification.error("Failed to start new game");
      }
    },
    [writeContractAsync, address],
  );

  const handleCellClick = useCallback(
    (x: number, y: number) => {
      if (!sessionState.isActive) {
        notification.error("Please create a session first");
        return;
      }
      if (gameState.board[y][x].isFlagged) {
        return;
      }
      setPendingMoves(prev => [...prev, { x, y }]);
    },
    [sessionState.isActive, gameState.board],
  );

  const handleCellRightClick = useCallback(
    (x: number, y: number) => {
      if (gameState.board[y][x].isRevealed) {
        return;
      }
      setGameState(prev => {
        const newBoard = prev.board.map(row => [...row]);
        newBoard[y][x] = {
          ...newBoard[y][x],
          isFlagged: !newBoard[y][x].isFlagged,
        };
        return {
          ...prev,
          board: newBoard,
        };
      });
    },
    [gameState.board],
  );

  // 移动处理相关函数
  const signMoves = async (moves: Move[], address: string, nonce: string, lastHash: string) => {
    if (!walletClient) throw new Error("Wallet not connected");

    if (!moves || !Array.isArray(moves)) {
      throw new Error("Invalid moves array");
    }

    const xCoords = moves.map(m => {
      if (typeof m.x !== "number") throw new Error(`Invalid x coordinate: ${m.x}`);
      return m.x;
    });
    const yCoords = moves.map(m => {
      if (typeof m.y !== "number") throw new Error(`Invalid y coordinate: ${m.y}`);
      return m.y;
    });

    // 检查参数格式
    if (!nonce.startsWith("0x")) {
      throw new Error(`Invalid nonce format: ${nonce}`);
    }
    if (!lastHash.startsWith("0x")) {
      throw new Error(`Invalid lastHash format: ${lastHash}`);
    }

    // const messageHash = ethers.keccak256(
    //   ethers.AbiCoder.defaultAbiCoder().encode(
    //     ["address", "uint8[]", "uint8[]", "bytes32", "bytes32"],
    //     [address, xCoords, yCoords, nonce, lastHash],
    //   ),
    // );

    // // 使用 personal_sign
    // const signature = await walletClient.signMessage({
    //   account: walletClient.account,
    //   message: { raw: messageHash } as any, // 使用 raw 参数直接签名哈希
    // });

    // return signature as `0x${string}`;
  };

  const sendMovesTransaction = async (moves: Move[]) => {
    try {
      // 确保 moves 数组格式正确
      const formattedMoves = moves.map(m => ({
        x: Number(m.x),
        y: Number(m.y),
      }));

      if (!writeContractAsync) {
        throw new Error("Contract write function not available");
      }

      const tx = await writeContractAsync({
        functionName: "processBatchMoves",
        args: [formattedMoves],
      });

      return tx;
    } catch (error) {
      console.error("Transaction error details:", error);
      throw error;
    }
  };

  const processPendingMoves = useCallback(async () => {
    if (!address || !walletClient || pendingMoves.length === 0) return;

    setIsProcessingMoves(true);
    try {
      // 1. 获取最新的 session 状态
      if (!contractSession) {
        throw new Error("Failed to read session state");
      }

      const [player, expiryTime, nonce, lastHash, lastActionTime,] = contractSession;

      // 2. 更新本地 session 状态
      setSessionState({
        ...sessionState,
        nonce,
        lastHash,
      });

      // 2. 准备移动数据
      const moves = pendingMoves.slice(0, 20);
      // 4. 签名移动
      await signMoves(moves, address, nonce, lastHash);

      // 5. 发送交易
      const tx = await sendMovesTransaction(moves);

      // 6. 更新待处理移动
      setPendingMoves(prev => prev.slice(moves.length));
    } catch (error) {
      console.error("Failed to process moves:", error);
      notification.error("Failed to process moves");
    } finally {
      setIsProcessingMoves(false);
    }
  }, [writeContractAsync, address, walletClient, pendingMoves, contractSession, setSessionState, sessionState]);

  const isMine = (boardHash: string, x: number, y: number): boolean => {
    const positionHash = ethers.solidityPackedKeccak256(["bytes32", "uint8", "uint8"], [boardHash, x, y]);

    const hashValue = BigInt(positionHash);
    const maxMinePositions = BigInt(16 * 16);

    return hashValue % maxMinePositions < BigInt(40);
  };

  const handleGameStart = useCallback(
    (event: any) => {
      if (!event?.args) return;

      const { player, boardHash, mineCount, timestamp } = event.args;
      if (player.toLowerCase() === address?.toLowerCase()) {
        setGameStartBlock(event.blockNumber);
        const newBoard = Array(16)
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
          );

        // 打印雷阵可视化，使用本地实现的 isMine 函数
        console.log("New Game Board Hash:", boardHash);
        console.log("Board Visualization:");
        let boardStr = "  0 1 2 3 4 5 6 7 8 9 a b c d e f\n";
        for (let y = 0; y < 16; y++) {
          boardStr += y.toString(16) + " ";
          for (let x = 0; x < 16; x++) {
            const hasMine = isMine(boardHash, x, y);
            boardStr += hasMine ? "💣" : "⬜";
            boardStr += " ";
          }
          boardStr += "\n";
        }
        console.log(boardStr);

        setGameState({
          ...INITIAL_BOARD_STATE,
          board: newBoard,
          startTime: Number(timestamp),
          stateHash: boardHash,
          mineCount: mineCount,  
        });
      }
    },
    [address],
  );

  const handleCellRevealed = useCallback(
    (event: any) => {
      if (!event?.args) return;

      const { player, x, y, adjacentMines, stateHash } = event.args;

      if (player.toLowerCase() === address?.toLowerCase()) {
        setGameState(prev => {
          const newBoard = [...prev.board];
          newBoard[y][x] = {
            isMine: false,
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
    },
    [address],
  );

  const handleGameOver = useCallback(
    (event: any) => {
      if (!event?.args) return;

      const { player, won, score, timeSpent } = event.args;
      if (player.toLowerCase() === address?.toLowerCase()) {

        setGameState(prev => {
          const newBoard = prev.board.map((row, y) =>
            row.map((cell, x) => {
              const hasMine = isMine(prev.stateHash, x, y);
              return {
                ...cell,
                isMine: hasMine,
                isRevealed: hasMine ? true : cell.isRevealed,
              };
            }),
          );

          return {
            ...prev,
            board: newBoard,
            isOver: true,
            hasWon: won,
            score: Number(score),
          };
        });
      }
    },
    [address],
  );

  useEffect(() => {
    if (gameStartEvents?.[0]?.args) {
      handleGameStart(gameStartEvents[0]);
    }
  }, [gameStartEvents, handleGameStart]);

  useEffect(() => {
    cellRevealedEvents?.forEach(handleCellRevealed);
  }, [cellRevealedEvents, handleCellRevealed]);

  useEffect(() => {
    if (gameOverEvents?.[0]?.args) {
      handleGameOver(gameOverEvents[0]);
    }
  }, [gameOverEvents, handleGameOver]);

  useEffect(() => {
    if (sessionState.expiryTime < Date.now() / 1000) {
      setGameState(INITIAL_BOARD_STATE);
      setPendingMoves([]);
    }
  }, [sessionState.expiryTime]);

  return {
    gameState,
    setGameState,
    pendingMoves,
    isProcessingMoves,
    startNewGame,
    handleCellClick,
    handleCellRightClick,
    processPendingMoves,
  };
};
