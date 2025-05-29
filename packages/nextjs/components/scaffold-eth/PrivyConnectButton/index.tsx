"use client";

import { usePrivy } from "@privy-io/react-auth";
import { Balance } from "../Balance";
import { Address } from "viem";
import { useNetworkColor } from "~~/hooks/scaffold-eth";
import { useTargetNetwork } from "~~/hooks/scaffold-eth/useTargetNetwork";
import { getBlockExplorerAddressLink } from "~~/utils/scaffold-eth";
import { useSetActiveWallet } from '@privy-io/wagmi';
import { useWallets } from '@privy-io/react-auth';
import { useEffect } from 'react';
import { usePrivyWallet } from "~~/hooks/usePrivyWallet";

export const PrivyConnectButton = () => {
  const { login, logout, authenticated, user, ready, exportWallet } = usePrivy();
  const networkColor = useNetworkColor();
  const { targetNetwork } = useTargetNetwork();
  const { setActiveWallet } = useSetActiveWallet();
  const { wallets } = useWallets();
  const wallet = usePrivyWallet();

  useEffect(() => {
    const activateWallet = async () => {
      if (wallet) {
        try {
          await setActiveWallet(wallet);
          console.log("Smart wallet activated successfully");
        } catch (error) {
          console.error("Failed to activate smart wallet:", error);
        }
      } else {
        console.log("Smart wallet found but not in connected wallets list");
      }
    };

    activateWallet();
  }, [wallets, setActiveWallet]);

  if (!ready) {
    return (
      <button className="btn btn-primary btn-sm" disabled>
        Loading...
      </button>
    );
  }

  if (!authenticated) {
    return (
      <button className="btn btn-primary btn-sm" onClick={login}>
        Connect Wallet
      </button>
    );
  }


  const address = wallet?.address;
  const blockExplorerAddressLink = address
    ? getBlockExplorerAddressLink(targetNetwork, address)
    : undefined;

  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-col items-center mr-1">
        <Balance address={address} className="min-h-0 h-auto" />
        <span className="text-xs" style={{ color: networkColor }}>
          {targetNetwork.name}
        </span>
      </div>
      <div className="dropdown dropdown-end">
        <label tabIndex={0} className="btn btn-primary btn-sm">
          {address?.slice(0, 6)}...{address?.slice(-4)}
        </label>
        <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 mt-2 shadow bg-base-100 rounded-box w-52">
          <li>
            <div className="flex items-center justify-between w-full">
              <span>{address?.slice(0, 6)}...{address?.slice(-6)}</span>
              <button
                className="p-0 hover:bg-base-200 rounded-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  if (address) {
                    navigator.clipboard.writeText(address);
                    alert("地址已复制到剪贴板");
                  }
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
              </button>
            </div>
          </li>
          <li>
            <a href={blockExplorerAddressLink} target="_blank" rel="noopener noreferrer">
              View on Explorer
            </a>
          </li>
          <li>
            <button onClick={exportWallet} disabled={!authenticated}>
              Export my wallet
            </button>
          </li>
          <li>
            <button onClick={logout}>Disconnect</button>
          </li>
        </ul>
      </div>
    </div>
  );
};