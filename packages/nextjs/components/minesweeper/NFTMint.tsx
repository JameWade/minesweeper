import { useNFTMint } from "~~/hooks/useNFTMint";
import { notification } from "~~/utils/scaffold-eth";
import { useEffect, useRef } from "react";
import { LeaderboardEntry } from "./types";
import { useAccount } from "wagmi";

export const NFTMint = ({ leaderboardEntries }: { leaderboardEntries: { address: string; score: number }[] }) => {
  const { address } = useAccount();
  const { mintStatus, mintNFT, generateNFTImage } = useNFTMint();
  const canvasRef = useRef<HTMLCanvasElement>(null);


  useEffect(() => {
    if (canvasRef.current) {
      generateNFTImage(canvasRef.current);
    }
  }, [generateNFTImage]);

  // 检查玩家是否在前10名
  const isInTop10 = leaderboardEntries
    .slice(0, 10)
    .some(entry => entry.address.toLowerCase() === address?.toLowerCase());

  if (!isInTop10 || mintStatus.hasMinted) {
    return null;
  }

  const handleMint = async () => {
    try {
      if (!canvasRef.current) {
        throw new Error("Canvas not ready");
      }
      await mintNFT(canvasRef.current);
      notification.success("NFT 铸造成功！");
    } catch (error) {
      console.error("Failed to mint NFT:", error);
      notification.error("铸造失败：" + (error as Error).message);
    }
  };

  const uploadToIPFS = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // 将 canvas 转换为 blob
    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob(blob => {
        if (blob) resolve(blob);
      }, 'image/png');
    });

    // TODO: 上传到 IPFS 的逻辑
    // 可以使用 web3.storage 或其他 IPFS 服务
  };

  return (
    <div className="fixed bottom-4 right-4 p-4 bg-base-200 rounded-lg shadow-lg">
      <h3 className="text-lg font-bold mb-2">🎉 恭喜！</h3>
      
      <p className="mb-2">
        你已进入排行榜第 {mintStatus.rank} 名！
        <br />
        得分：{mintStatus.score}
      </p>
      <p className="mb-4 text-sm opacity-70">
        你可以铸造一个专属 NFT 来纪念这个成就
      </p>
      <canvas
        ref={canvasRef}
        className="border border-primary rounded-lg mb-4"
        style={{ maxWidth: "100%", display: "block", margin: "0 auto" }}
      />
      <button
        className="btn btn-primary w-full"
        onClick={handleMint}
      >
        铸造 NFT (0.1 ETH)
      </button>
    
    </div>
  );
}; 