import { useCallback, useEffect, useState } from "react";
import { ethers } from "ethers";
import { useAccount, useWalletClient } from "wagmi";
import { GameState, Move } from "~~/components/minesweeper/types";
import {  useScaffoldReadContract, useScaffoldWriteContract,useScaffoldWatchContractEvent } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";
import { isMine, getAdjacentMines } from "~~/utils/scaffold-eth";
import { useWaitForTransactionReceipt } from 'wagmi'
import { keccak256 } from 'ethers'
import { Interface } from 'ethers';
import deployedContracts from "~~/contracts/deployedContracts";

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
  boardHash: "",
  mineCount: 0
};

export const useGameBoard = () => {
  const [gameState, setGameState] = useState<GameState>(INITIAL_BOARD_STATE);
  const [pendingMoves, setPendingMoves] = useState<Move[]>([]);
  const [isProcessingMoves, setIsProcessingMoves] = useState(false);
  const [gameStartBlock, setGameStartBlock] = useState<bigint>(0n);
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [txList, setTxList] = useState<{ hash: `0x${string}`; type: string }[]>([]);
  const [currentTxIndex, setCurrentTxIndex] = useState(0);  // 当前正在等待的交易索引

  const { writeContractAsync } = useScaffoldWriteContract({
    contractName: "Minesweeper",
  });


  const startNewGameSig = keccak256(
    ethers.toUtf8Bytes("StartNewGame(address,bytes32,uint8,uint256)")
  );
  const { data: currentGame } = useScaffoldReadContract({
    contractName: "Minesweeper",
    functionName: "games",
    args: [address],
    watch: false,
  });

  const iface = new Interface(deployedContracts[10143].Minesweeper.abi);

  const handleCellRevealed = useCallback(
    (event: any) => {
      const decodedEvent = {
        player: event.player,
        x: Number(event.x),
        y: Number(event.y),
        adjacentMines: Number(event.adjacentMines),
        stateHash: event.stateHash,
        moveCount: Number(event.moveCount)
      };

      if (decodedEvent.player.toLowerCase() === address?.toLowerCase()) {
        setGameState(prev => {
          const newBoard = [...prev.board];
          newBoard[decodedEvent.y][decodedEvent.x] = {
            isMine: false,
            isRevealed: true,
            isFlagged: false,
            adjacentMines: decodedEvent.adjacentMines,
          };
          return {
            ...prev,
            stateHash: decodedEvent.stateHash,
            boardHash: prev.boardHash,
            board: newBoard,
          };
        });
      }
    },
    [address],
  );
  const { data: receipt, isSuccess } = useWaitForTransactionReceipt({
    hash: currentTxIndex < txList.length ? txList[currentTxIndex]?.hash : undefined,
  });

  // 处理交易收据
  useEffect(() => {
    if (!isSuccess || !receipt || !txList[currentTxIndex]) return;

    const tx = txList[currentTxIndex];
    const processLogs = () => {
      if (tx.type === "processBatchMoves") {
        receipt.logs.forEach(log => {
          const parsedLog = iface.parseLog(log);
          try {
            if (parsedLog?.name === "CellRevealed") {
              const decodedLog = iface.decodeEventLog("CellRevealed", log.data, log.topics);
              handleCellRevealed(decodedLog);
            } else if (parsedLog?.name === "GameOver") {
              const decodedLog = iface.decodeEventLog("GameOver", log.data, log.topics);
              handleGameOverEvent(decodedLog);
            }
          } catch (e) {
            console.log("Failed to decode log:", e);
          }
        });
      }else if (tx.type === "startNewGame") {
        receipt.logs.forEach(log => {
          const parsedLog = iface.parseLog(log);
          try {
            if (parsedLog?.name === "GameStarted") {
              const decodedLog = iface.decodeEventLog("GameStarted", log.data, log.topics);
              handleGameStartEvent(decodedLog);
            } 
          } catch (e) {
            console.log("Failed to decode log:", e);
          }
        });
      }
    };

    processLogs();
    setCurrentTxIndex(prev => prev + 1);
  }, [receipt?.blockNumber, isSuccess, currentTxIndex]);

  // 当所有交易处理完成时重置
  useEffect(() => {
    if (currentTxIndex >= txList.length && txList.length > 0) {
      setTxList([]);
      setCurrentTxIndex(0);
    }
  }, [currentTxIndex, txList]);

  const startNewGame = useCallback(async (salt: string) => {
    if (!address) {
      notification.error("Please connect your wallet");
      return;
    }

    try {
      const tx = await writeContractAsync({
        functionName: "startNewGame",
        args: [salt as `0x${string}`],
        gas: 500000n,
      });
      
      setTxList(prev => [...prev, { hash: tx as `0x${string}`, type: "startNewGame" }]);
      notification.success("New game started");
    } catch (error) {
      console.error("Failed to start new game:", error);
      notification.error("Failed to start new game");
    }
  }, [writeContractAsync, address]);

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


  const sendMovesTransaction = async (moves: Move[]) => {
    try {
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
      const moves = pendingMoves.slice(0, 20);
      const tx = await sendMovesTransaction(moves);
      setTxList((prev) => [...prev, { hash: tx as `0x${string}`, type: "processBatchMoves" }]);

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
      // 转换所有数字类型
      const decodedEvent = {
        player: event.player,
        boardHash: event.boardHash,
        mineCount: Number(event.mineCount),  
        timestamp: Number(event.timestamp)    
      };

      if (decodedEvent.player.toLowerCase() !== address?.toLowerCase()) return;  

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

      setGameStartBlock(event.blockNumber);
      setPendingMoves([]);
      setGameState({
        ...INITIAL_BOARD_STATE,
        board: newBoard,
        startTime: decodedEvent.timestamp, 
        stateHash: decodedEvent.boardHash,
        boardHash: decodedEvent.boardHash,
        mineCount: decodedEvent.mineCount,  
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
      printBoard(boardHash);
      setGameState({
        ...INITIAL_BOARD_STATE,
        board: newBoard,
        boardHash: boardHash,
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
        printBoard(boardHash);
        return {
          ...prev,
          board: newBoard,
          moveCount: Number(moveCount),
          stateHash: stateHash,
          boardHash: boardHash,
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
      const decodedEvent = {
        player: event.player,
        won: Boolean(event.won),
        score: Number(event.score),
        timeSpent: Number(event.timeSpent)
      };

      if (decodedEvent.player.toLowerCase() === address?.toLowerCase()) {
        setGameState(prev => {
          const newBoard = prev.board.map((row, y) =>
            row.map((cell, x) => {
              const hasMine = isMine(prev.boardHash, x, y);
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
            hasWon: decodedEvent.won,
            score: decodedEvent.score,
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

  const printBoard = useCallback((boardHash: string) => {
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
    
  }, []);
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
