import { useCallback, useState, useEffect } from "react";
import { parseEther } from "viem";
import { useAccount } from "wagmi";
import { SessionState } from "~~/components/minesweeper/types";
import { useScaffoldEventHistory, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";
import { ethers } from "ethers";

export const useGameSession = () => {
  const [sessionState, setSessionState] = useState<SessionState>({
    isActive: false,
    expiryTime: 0,
    nonce: "0x",
    lastHash: "0x",
    remainingGas: 0,
    stake: parseEther("1"),
  });

  const { address } = useAccount();
  const { writeContractAsync } = useScaffoldWriteContract({
    contractName: "Minesweeper",
  });

  const { data: sessionEvents } = useScaffoldEventHistory({
    contractName: "Minesweeper",
    eventName: "SessionCreated",
    fromBlock: 0n,
    filters: { player: address },
    watch: true,
  });

  const createSession = useCallback(async () => {
    if (!address) {
      notification.error("Please connect your wallet");
      return;
    }

    try {
      await writeContractAsync({
        functionName: "createSession",
        value: sessionState.stake,
        gas: 500000n,
        gasPrice: 1000000000n, // 1 gwei
      });
    } catch (error) {
      notification.error("Failed to create session");
    }
  }, [writeContractAsync, sessionState.stake]);

  useEffect(() => {
    if (sessionEvents && sessionEvents.length > 0 && sessionEvents[0].args) {
      const { player, expiryTime, nonce } = sessionEvents[0].args;
      if (player?.toLowerCase() === address?.toLowerCase()) {
        setSessionState(prev => ({
          ...prev,
          isActive: true,
          expiryTime: Number(expiryTime),
          nonce: nonce || "0x",
          lastHash: ethers.keccak256(ethers.solidityPacked(["bytes32"], [nonce])),
        }));
      }
    }
  }, [sessionEvents, address]);

  return {
    sessionState,
    setSessionState,
    createSession,
  };
};
