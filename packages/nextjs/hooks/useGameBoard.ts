import { useCallback, useEffect, useState } from "react";
import { ethers } from "ethers";
import { useAccount, useWalletClient } from "wagmi";
import { GameState, Move } from "~~/components/minesweeper/types";
import {  useScaffoldReadContract, useScaffoldWriteContract,useScaffoldWatchContractEvent } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";
import { isMine, getAdjacentMines } from "~~/utils/scaffold-eth";
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

export const useGameBoard = () => {
  const [gameState, setGameState] = useState<GameState>(INITIAL_BOARD_STATE);
  const [pendingMoves, setPendingMoves] = useState<Move[]>([]);
  const [isProcessingMoves, setIsProcessingMoves] = useState(false);
  const [gameStartBlock, setGameStartBlock] = useState<bigint>(0n);
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { writeContractAsync } = useScaffoldWriteContract({
    contractName: "Minesweeper",
  });

  const { data: currentGame } = useScaffoldReadContract({
    contractName: "Minesweeper",
    functionName: "games",
    args: [address],
    watch: false,
  });

  // game的恢复一开始是用的读取所有log恢复，monad限制了请求数量，后来改成了useScaffoldReadContract的持续监听，还是限制，导致了429
  //所以考虑换成读取进入时的状态 + watch监听
  useScaffoldWatchContractEvent({
    contractName: "Minesweeper",
    eventName: "CellRevealed",
    onLogs: logs => {
      logs.map(log => {
        handleCellRevealed(log);
      });
    },
  });

  useScaffoldWatchContractEvent({
    contractName: "Minesweeper",
    eventName: "GameStarted",
    onLogs: logs => {
      logs.map(log => {
        handleGameStartEvent(log);
      });
    },
  });

  useScaffoldWatchContractEvent({
    contractName: "Minesweeper",
    eventName: "GameOver",
    onLogs: logs => {
      logs.map(log => {
        handleGameOverEvent(log);
      });
    },
  });

  ///////////////////////
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
            stateHash: stateHash,
            board: newBoard,
          };
        });
      }
    },
    [address],
  );


  
  const startNewGame = useCallback(
    async (salt: string) => {
      if (!address) {
        notification.error("Please connect your wallet");
        return;
      }

      try {
        const result = await writeContractAsync({
          functionName: "startNewGame",
          args: [salt as `0x${string}`],
          gas: 500000n,
        },
        {
          onSuccess: (data) => console.log("交易成功:", data),
          onError: (error) => console.error("交易失败:", error),
          onSettled: () => console.log("交易已完成"),
        }
      );
        notification.success("New game started");
      } catch (error) {
        console.error("Failed to start new game:", error);
        notification.error("Failed to start new game");
      }
    },
    [writeContractAsync, address],
  );

  const handleCellClick = useCallback(
    (x: number, y: number) => {
      if (gameState.board[y][x].isFlagged) {
        return;
      }
      setPendingMoves(prev => [...prev, { x, y }]);
    },
    [gameState.board],
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
  const signMoves = async (moves: Move[], address: string) => {
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
     

      // 2. 准备移动数据
      const moves = pendingMoves.slice(0, 20);
      // 4. 签名移动
      await signMoves(moves, address);

      // 5. 发送交易
      const tx = await sendMovesTransaction(moves);
 

      console.log("tx", tx);

      // 6. 更新待处理移动
      setPendingMoves(prev => prev.slice(moves.length));
    } catch (error) {
      console.error("Failed to process moves:", error);
      notification.error("Failed to process moves");
    } finally {
      setIsProcessingMoves(false);
    }
  }, [writeContractAsync, address, walletClient, pendingMoves]);

  const handleGameStartEvent = useCallback(
    (event: any) => {
      if (!event?.args) return;

      const { player, boardHash, mineCount, timestamp } = event.args;
      if (player.toLowerCase() !== address?.toLowerCase()) return;  

      // 先创建新棋盘
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
      // console.log("我还是希望你不要作弊！");
      // console.log("New Game Board Hash:", boardHash);
      // console.log("Board Visualization:");
      // let boardStr = "  0 1 2 3 4 5 6 7 8 9 a b c d e f\n";
      // for (let y = 0; y < 16; y++) {
      //   boardStr += y.toString(16) + " ";
      //   for (let x = 0; x < 16; x++) {
      //     const hasMine = isMine(boardHash, x, y);
      //     boardStr += hasMine ? "💣" : "⬜";
      //     boardStr += " ";
      //   }
      //   boardStr += "\n";
      // }
      // console.log(boardStr);
      // 一次性更新所有状态
      setGameStartBlock(event.blockNumber);
      setPendingMoves([]);
      setGameState({
        ...INITIAL_BOARD_STATE,
        board: newBoard,
        startTime: Number(timestamp),
        stateHash: boardHash,
        mineCount: mineCount,  
      });
    },
    [address],
  );


  const handleGameStartHistory = useCallback(
    (currentGame: any) => {
      const [boardHash, revealedMask, startTime, isOver, isStarted, score, stateHash, moveCount, mineCount, startBlock] = currentGame;
      setGameStartBlock(startBlock);

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
      console.log("我还是希望你不要作弊！");
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
        startTime: Number(startTime),
        stateHash: stateHash,
        mineCount: mineCount,
      });
    },
    [address, setGameState]
  );


  const handleGameStatus = useCallback(
    (currentGame: any) => {
      const [boardHash, revealedMask, startTime, isOver, isStarted, score, stateHash, moveCount, mineCount, startBlock] = currentGame;
      // 根据 revealedMask 更新已揭示的格子
      setGameState(prev => {
        const newBoard = [...prev.board];
        let mask = BigInt(revealedMask);
        for (let y = 0; y < 16; y++) {
          for (let x = 0; x < 16; x++) {
            const bitIndex = y * 16 + x;
            if ((mask >> BigInt(bitIndex)) & 1n) {
              newBoard[y][x].isRevealed = true;
              newBoard[y][x].adjacentMines =  getAdjacentMines(boardHash, x, y);
            }
          }
        }
        return {
          ...prev,
          board: newBoard,
          moveCount: Number(moveCount),
          stateHash: stateHash,
          mineCount: mineCount,
          startTime: Number(startTime),
          score: Number(score),
        };
      });
    },
    [address,setGameState]
  );

  const handleGameOver = useCallback(
    (currentGame: any) => {
      const [boardHash, revealedMask, startTime, isOver, isStarted, score, stateHash, moveCount, mineCount, startBlock, hasWon] = currentGame;
        setGameState(prev => {
          const newBoard = prev.board.map((row, y) =>
            row.map((cell, x) => {
              const hasMine = isMine(boardHash, x, y);
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
            hasWon: hasWon,
            score: Number(score),
          };
        });
      
    },
    [address],
  );

  const handleGameOverEvent = useCallback(
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
    if (currentGame) {
      const [boardHash, revealedMask, startTime, isOver, isStarted, score, stateHash, moveCount, mineCount, startBlock, hasWon] = currentGame;
    
      if (isStarted && !isOver) {
        if (revealedMask === 0n) {
          handleGameStartHistory(currentGame);
        } else {
          handleGameStatus(currentGame);
        }
      } else if (isOver) {
        handleGameOver(currentGame);
      } else {
        setGameState(INITIAL_BOARD_STATE);
        setPendingMoves([]);
      }
    }
  }, [currentGame]);

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
