import { useCallback, useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { SessionState } from "~~/components/minesweeper/types";
import { useScaffoldWriteContract, useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

const SESSION_DURATION = 60 * 60; // 1 hour in seconds, matching contract's SESSION_DURATION

export const useGameSession = () => {
  const [sessionState, setSessionState] = useState<SessionState>({
    isActive: false,
    expiryTime: 0,
    nonce: "0x",
    lastHash: "0x",
    createdAt: 0,
  });

  const { address } = useAccount();
  const { writeContractAsync } = useScaffoldWriteContract({
    contractName: "Minesweeper",
  });


  const { data: contractSession } = useScaffoldReadContract({
    contractName: "Minesweeper",
    functionName: "sessions",
    args: [address],
  });

  const createSession = useCallback(async () => {
    if (!address) {
      notification.error("Please connect your wallet");
      return;
    }

    try {
      await writeContractAsync({
        functionName: "createSession",
        gas: 500000n,
        gasPrice: 1000000000n,
      });
    } catch (error) {
      notification.error("Failed to create session");
    }
  }, [writeContractAsync, address]);

  useEffect(() => {
    if (contractSession) {
      const [player, expiryTime, nonce, lastHash, lastActionTime] = contractSession;
      const now = Math.floor(Date.now() / 1000);
      
      if (Number(expiryTime) > now) {
        setSessionState({
          isActive: true,
          expiryTime: Number(expiryTime),
          nonce: nonce || "0x",
          lastHash: lastHash,
          createdAt: Number(expiryTime) - SESSION_DURATION,
        });
      } else {
        setSessionState(prev => ({
          ...prev,
          isActive: false,
          expiryTime: 0,
          nonce: "0x",
          lastHash: "0x",
          createdAt: 0,
        }));
      }
    }
  }, [contractSession]);



  const closeSession = useCallback(async () => {
    if (!address) {
      notification.error("Please connect your wallet");
      return;
    }

    try {
      await writeContractAsync({
        functionName: "closeSession",
      });

      const now = Math.floor(Date.now() / 1000);
      setSessionState({
        isActive: false,
        expiryTime: 0,
        nonce: "0x",
        lastHash: "0x",
        createdAt: now,
      });

      notification.success("Session closed successfully");
    } catch (error) {
      console.error("Failed to close session:", error);
      notification.error("Failed to close session");
    }
  }, [writeContractAsync, address]);

  return {
    sessionState,
    setSessionState,
    createSession,
    closeSession,
  };
};
