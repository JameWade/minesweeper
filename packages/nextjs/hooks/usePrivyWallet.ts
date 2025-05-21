import { useWallets } from "@privy-io/react-auth";

export const usePrivyWallet = () => {
  const { wallets } = useWallets();
  return wallets.find(wallet => wallet.walletClientType === 'privy') || null;
};