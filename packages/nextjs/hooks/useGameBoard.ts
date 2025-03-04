import { useCallback, useEffect, useState } from "react";
import { ethers } from "ethers";
import { useAccount, useWalletClient } from "wagmi";
import { Cell, GameState, Move, SessionState } from "~~/components/minesweeper/types";
import { useScaffoldEventHistory, useScaffoldWriteContract, useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";
import { usePublicClient } from "wagmi";

// 初始状态
const INITIAL_BOARD_STATE: GameState = {
  board: Array(16).fill(null).map(() =>
    Array(16).fill(null).map(() => ({
      isMine: false,
      isRevealed: false,
      isFlagged: false,
      adjacentMines: 0,
    }))
  ),
  moveCount: 0,
  isOver: false,
  hasWon: false,
  startTime: 0,
  stateHash: "",
  score: 0,
};

export const useGameBoard = ({ sessionState, setSessionState }: {
  sessionState: SessionState;
  setSessionState: (state: SessionState) => void;
}) => {
  // 状态管理
  const [gameState, setGameState] = useState<GameState>(INITIAL_BOARD_STATE);
  const [pendingMoves, setPendingMoves] = useState<Move[]>([]);
  const [isProcessingMoves, setIsProcessingMoves] = useState(false);

  // Web3 hooks
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { writeContractAsync } = useScaffoldWriteContract({
    contractName: "Minesweeper",
  });

  // 事件监听
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

  // 使用 scaffold 读取合约
  const { data: contractSession } = useScaffoldReadContract({
    contractName: "Minesweeper",
    functionName: "sessions",
    args: [address],
  });

  // 游戏操作函数
  const startNewGame = useCallback(async (salt: string) => {
    if (!address) {
      notification.error("Please connect your wallet");
      return;
    }

    try {
      await writeContractAsync({
        functionName: "startNewGame",
        args: [salt],
      });
    } catch (error) {
      console.error("Failed to start new game:", error);
      notification.error("Failed to start new game");
    }
  }, [writeContractAsync, address]);

  const handleCellClick = useCallback((x: number, y: number) => {
    if (!sessionState.isActive) {
      notification.error("Please create a session first");
      return;
    }
    setPendingMoves(prev => [...prev, { x, y }]);
  }, [sessionState.isActive]);

  // 移动处理相关函数
  const signMoves = async (moves: Move[], address: string, nonce: string, lastHash: string): Promise<`0x${string}`> => {
    if (!walletClient) throw new Error("Wallet not connected");

    if (!moves || !Array.isArray(moves)) {
      throw new Error("Invalid moves array");
    }

    const xCoords = moves.map(m => {
      if (typeof m.x !== 'number') throw new Error(`Invalid x coordinate: ${m.x}`);
      return m.x;
    });
    const yCoords = moves.map(m => {
      if (typeof m.y !== 'number') throw new Error(`Invalid y coordinate: ${m.y}`);
      return m.y;
    });


    // 检查参数格式
    if (!nonce.startsWith('0x')) {
      throw new Error(`Invalid nonce format: ${nonce}`);
    }
    if (!lastHash.startsWith('0x')) {
      throw new Error(`Invalid lastHash format: ${lastHash}`);
    }

    const messageHash = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "uint8[]", "uint8[]", "bytes32", "bytes32"],
        [address, xCoords, yCoords, nonce, lastHash]
      )
    );

    console.log("messageHash data:", [address, xCoords, yCoords, nonce, lastHash])
    console.log("messageHash:", messageHash)
    // 使用 personal_sign
    const signature = await walletClient.signMessage({
      account: walletClient.account,
      message: { raw: messageHash } as any, // 使用 raw 参数直接签名哈希
    });

    return signature as `0x${string}`;
  };

  const sendMovesTransaction = async (moves: Move[], signature: `0x${string}`) => {
    try {
      // 确保 moves 数组格式正确
      const formattedMoves = moves.map(m => ({
        x: BigInt(m.x),
        y: BigInt(m.y)
      }));


      if (!writeContractAsync) {
        throw new Error("Contract write function not available");
      }

      const tx = await writeContractAsync({
        functionName: "processBatchMoves",
        args: [formattedMoves, signature],
      });

      console.log("Transaction response:", tx);
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

      const [player, expiryTime, nonce, lastHash, lastActionTime, remainingGas] = contractSession;

      // 2. 更新本地 session 状态
      setSessionState({
        ...sessionState,
        nonce,
        lastHash,
      });

      // 2. 准备移动数据
      const moves = pendingMoves.slice(0, 20);
      console.log("Processing moves:", {
        moves,
        nonce,
        lastHash
      });

      // 4. 签名移动
      const signature = await signMoves(
        moves,
        address,
        nonce,
        lastHash
      );

      // 5. 发送交易
      const tx = await sendMovesTransaction(moves, signature);
      console.log("Transaction sent:", tx);

      // 6. 更新待处理移动
      setPendingMoves(prev => prev.slice(moves.length));
    } catch (error) {
      console.error("Failed to process moves:", error);
      notification.error("Failed to process moves");
    } finally {
      setIsProcessingMoves(false);
    }
  }, [writeContractAsync, address, walletClient, pendingMoves, contractSession, setSessionState, sessionState]);

  // 添加雷阵检查函数
  const isMine = (boardHash: string, x: number, y: number): boolean => {
    const positionHash =
      ethers.solidityPackedKeccak256(
        ["bytes32", "uint8", "uint8"],
        [boardHash, x, y]
      );

    console.log("positionHash:", positionHash)
    const hashValue = BigInt(positionHash);
    const maxMinePositions = BigInt(16 * 16);

    return hashValue % maxMinePositions < BigInt(40);
  };

  const handleGameStart = useCallback((event: any) => {
    if (!event?.args) return;

    const { player, boardHash, timestamp } = event.args;
    if (player.toLowerCase() === address?.toLowerCase()) {
      const newBoard = Array(16).fill(null).map(() =>
        Array(16).fill(null).map(() => ({
          isMine: false,
          isRevealed: false,
          isFlagged: false,
          adjacentMines: 0,
        }))
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
        stateHash: boardHash
      });
    }
  }, [address]);

  const handleCellRevealed = useCallback((event: any) => {
    if (!event?.args) return;

    const { player, x, y, adjacentMines } = event.args;
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
  }, [address]);

  // 事件监听效果
  useEffect(() => {
    if (gameStartEvents?.[0]?.args) {
      handleGameStart(gameStartEvents[0]);
    }
  }, [gameStartEvents, handleGameStart]);

  useEffect(() => {
    cellRevealedEvents?.forEach(handleCellRevealed);
  }, [cellRevealedEvents, handleCellRevealed]);

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
