"use client";

import { useEffect, useRef, useState } from "react";
import { usePrivy, useWallets, CrossAppAccountWithMetadata } from "@privy-io/react-auth";
import { useSetActiveWallet } from "@privy-io/wagmi";
import { Balance } from "../Balance";
import { useNetworkColor } from "~~/hooks/scaffold-eth";
import { useTargetNetwork } from "~~/hooks/scaffold-eth/useTargetNetwork";
import { getBlockExplorerAddressLink } from "~~/utils/scaffold-eth";

export const PrivyConnectButton = () => {
  const { login, logout, authenticated, ready, exportWallet, user } = usePrivy();
  const networkColor = useNetworkColor();
  const { targetNetwork } = useTargetNetwork();
  const { setActiveWallet } = useSetActiveWallet();
  const { wallets } = useWallets();

  // 用户名状态管理
  const [username, setUsername] = useState<string | null>(null);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [accountAddress, setAccountAddress] = useState<string | null>(null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  // 检查用户名的函数
  const checkUsername = async (walletAddress: string) => {
    console.log("开始检查用户名，钱包地址:", walletAddress);
    setIsCheckingUsername(true);
    try {
      const candidateUrls = [
        `https://www.monadclip.fun/api/check-wallet?wallet=${walletAddress}`,
        `https://monadclip.fun/api/check-wallet?wallet=${walletAddress}`,
      ];

      let data: any | null = null;
      let lastStatus: number | undefined;

      for (const url of candidateUrls) {
        try {
          console.log("请求URL:", url);
          const response = await fetch(url, {
            method: "GET",
            mode: "cors",
            redirect: "follow",
            headers: { Accept: "application/json" },
          });
          lastStatus = response.status;
          console.log("API响应状态:", response.status);
          if (!response.ok) {
            continue;
          }
          data = await response.json();
          break;
        } catch (e) {
          console.warn("请求失败，尝试下一个URL", url, e);
        }
      }

      if (!data) {
        console.warn("所有候选URL均未成功，最后状态码:", lastStatus);
        // 不弹窗，静默失败
        return;
      }
      console.log("API响应数据:", data);

      // 仅当 hasUsername === false 时弹窗；hasUsername === true 时读取用户名并关闭弹窗
      if (typeof data?.hasUsername === "boolean") {
        if (data.hasUsername) {
          const apiUsername = data?.user?.username ?? null;
          console.log("找到用户名:", apiUsername);
          setUsername(apiUsername);
          setShowRegisterModal(false);
        } else {
          console.log("未找到用户名");
          setUsername(null);
          setShowRegisterModal(true);
        }
      } else {
        console.warn("API返回结构异常，保持静默不弹窗", data);
        // 不确定的结构，不弹窗
        setShowRegisterModal(false);
      }
    } catch (error) {
      console.error("检查用户名时出错:", error);
      // API失败：不弹窗，避免误导；保持当前状态
      setShowRegisterModal(false);
    } finally {
      setIsCheckingUsername(false);
      console.log("用户名检查完成");
    }
  };

  // useEffect(() => {
  //   const activateWallet = async () => {
  //     if (wallet && wallet.address) {
  //       try {
  //         await setActiveWallet(wallet);
  //         console.log("智能钱包激活成功，地址:", wallet.address);

  //         // 钱包激活后检查用户名
  //         console.log("开始检查用户名...");
  //         await checkUsername(wallet.address);
  //       } catch (error) {
  //         console.error("激活智能钱包失败:", error);
  //       }
  //     } else {
  //       console.log("钱包或地址不可用:", wallet);
  //     }
  //   };

  //   if (authenticated && wallet) {
  //     activateWallet();
  //   }
  // }, [authenticated, wallet?.address, setActiveWallet]);
  useEffect(() => {
    // privy 就绪且已认证时解析 Monad Games ID 的地址
    if (authenticated && user && ready) {
      if (user.linkedAccounts.length > 0) {
        const crossAppAccount = user.linkedAccounts.filter(
          account => account.type === "cross_app" && (account as any)?.providerApp?.id === "cmd8euall0037le0my79qpz42"
        )[0] as CrossAppAccountWithMetadata | undefined;

        if (crossAppAccount) {
          const embeddedAddr = crossAppAccount.embeddedWallets?.[0]?.address;
          const fallbackAddr = (crossAppAccount as any)?.address as string | undefined;
          const finalAddr = embeddedAddr || fallbackAddr || null;
          if (finalAddr) {
            setAccountAddress(finalAddr);
          }
        }
      }
    }
  }, [authenticated, user, ready]);

  // 当拿到玩家的 Monad Games ID 钱包地址后，检查用户名
  useEffect(() => {
    if (authenticated && ready && accountAddress) {
      checkUsername(accountAddress);
    }
  }, [authenticated, ready, accountAddress]);

  // 将激活钱包设置为 embeddedWallet（与 Monad Games ID 对应的钱包）
  const hasActivatedRef = useRef(false);
  useEffect(() => {
    console.log("激活embedded effect触发", {
      authenticated,
      ready,
      accountAddress,
      walletsLen: wallets?.length,
      hasActivated: hasActivatedRef.current,
    });
  
    if (!authenticated) {
      console.warn("早退：未认证");
      return;
    }
    if (!ready) {
      console.warn("早退：Privy未就绪");
      return;
    }
    if (!accountAddress) {
      console.warn("早退：没有accountAddress（还未解析出cross_app embedded地址）");
      return;
    }
    if (!wallets || wallets.length === 0) {
      console.warn("早退：wallets为空");
      return;
    }
    if (hasActivatedRef.current) {
      console.warn("早退：已激活过，避免重复");
      return;
    }

     try {
       const desired = accountAddress.toLowerCase();
       const available = (wallets || []).map(w => ({ addr: (w as any)?.address, type: (w as any)?.type }));
       console.log("期望激活地址:", accountAddress);
       console.log("可用钱包列表:", available);

       const target = wallets.find(w => (w as any)?.address?.toLowerCase() === desired);
       if (target) {
         console.log("匹配到 embeddedWallet，准备激活:", (target as any).address);
         hasActivatedRef.current = true;
         setActiveWallet(target)
           .then(() => console.log("已激活 embeddedWallet"))
           .catch(err => console.error("激活 embeddedWallet 失败:", err));
       } else {
         console.warn("未在钱包列表中找到匹配地址:", accountAddress, "钱包列表:", available.map(a => a.addr));
       }
     } catch (err) {
       console.error("设置激活钱包时异常:", err);
     }
  }, [authenticated, ready, accountAddress, wallets, setActiveWallet]);

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

  
  const address = accountAddress;



  const blockExplorerAddressLink = address ? getBlockExplorerAddressLink(targetNetwork, address) : undefined;

  return (
    <div className="flex items-center gap-2">
      {/* 无用户名时的引导弹窗 */}
      <div className={`modal ${showRegisterModal ? "modal-open" : ""}`}>
        <div className="modal-box">
          <h3 className="font-bold text-lg">需要注册用户名</h3>
          <p className="py-2 text-sm">检测到此钱包还未在 Monad Games 预留用户名。</p>
          <p className="text-sm">点击“前往注册”打开注册页面完成用户名预留。</p>
          <div className="modal-action">
            <a
              href="https://monadclip.fun/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
              onClick={e => e.stopPropagation()}
            >
              前往注册
            </a>
            <button className="btn" onClick={() => setShowRegisterModal(false)}>稍后</button>
          </div>
        </div>
      </div>
      <div className="flex flex-col items-center mr-1">
        <Balance address={address} className="min-h-0 h-auto" />
        <span className="text-xs" style={{ color: networkColor }}>
          {targetNetwork.name}
        </span>
      </div>
      <div className="dropdown dropdown-end">
        <label tabIndex={0} className="btn btn-primary btn-sm">
          {isCheckingUsername ? (
            <span className="inline-flex items-center gap-2">
              <span className="loading loading-spinner loading-xs"></span>
              <span className="text-xs">检查中</span>
            </span>
          ) : username ? (
            <span className="inline-flex items-center gap-2">
              <span className="avatar placeholder">
                <span className="bg-base-100 text-base-content rounded-full w-6 text-xs flex items-center justify-center">
                  {username?.[0]?.toUpperCase()}
                </span>
              </span>
              <span className="text-sm font-medium truncate max-w-[96px]">{username}</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 opacity-80" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.24 4.5a.75.75 0 01-1.08 0l-4.24-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
              </svg>
            </span>
          ) : (
            <span className="inline-flex items-center gap-2">
              <span className="font-mono text-xs">
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </span>
              <span className="badge badge-warning badge-xs">未注册</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 opacity-80" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.24 4.5a.75.75 0 01-1.08 0l-4.24-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
              </svg>
            </span>
          )}
        </label>
        <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 mt-2 shadow bg-base-100 rounded-box w-52">
          <li>
            <div className="flex items-center justify-between w-full">
              <span>
                {address?.slice(0, 6)}...{address?.slice(-6)}
              </span>
              <button
                className="p-0 hover:bg-base-200 rounded-sm"
                onClick={e => {
                  e.stopPropagation();
                  if (address) {
                    navigator.clipboard.writeText(address);
                    alert("地址已复制到剪贴板");
                  }
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
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