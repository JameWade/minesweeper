import { useCallback, useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { NFTMintStatus } from "~~/components/minesweeper/types";
import { useScaffoldEventHistory, useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

export const useNFTMint = () => {
  const { address } = useAccount();
  const [tokenURI, setTokenURI] = useState<string>("");
  const [mintStatus, setMintStatus] = useState<NFTMintStatus>({
    canMint: false,
    hasMinted: false,
  });
  const [startBlock, setStartBlock] = useState<bigint>(0n);
  const { writeContractAsync } = useScaffoldWriteContract({
    contractName: "MinesweeperNFT",
  });
  // 读取是否有铸造资格
  const { data: canMint } = useScaffoldReadContract({
    contractName: "MinesweeperNFT",
    functionName: "canMint",
    args: [address],
  });

  // 读取是否已经铸造过
  const { data: hasMinted } = useScaffoldReadContract({
    contractName: "MinesweeperNFT",
    functionName: "hasMinted",
    args: [address],
  });

  useEffect(() => {
    if (mintStatus.rank && mintStatus.score) {
      setTokenURI(`https://nftstorage.link/ipfs/bafybeibnsoufr2renqzsh347nrx54wcubt5lgkeivez63xvivplfwhtdhu/${mintStatus.rank}-${mintStatus.score}.png`);
    }
  }, [mintStatus.rank, mintStatus.score]);

  const uploadToIPFS = useCallback(async (canvas: HTMLCanvasElement) => {
    // 将 canvas 转换为 blob
    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob(blob => {
        if (blob) resolve(blob);
      }, 'image/png');
    });

    try {
      // 创建 File 对象
      const file = new File([blob], `nft-${mintStatus.rank}-${mintStatus.score}.png`, { type: 'image/png' });

      // 使用 Pinata 的 API
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
        method: 'POST',
        headers: {
          'pinata_api_key': `${process.env.NEXT_PUBLIC_PINATA_API_KEY}`,
          'pinata_secret_api_key': `${process.env.NEXT_PUBLIC_PINATA_API_SECRET}`,
        },
        body: formData
      });

      const data = await response.json();
      const ipfsUrl = `ipfs://${data.IpfsHash}`;
      const httpUrl = `https://ipfs.infura.io/ipfs/${data.IpfsHash}`;
      console.log('IPFS URLs:', {
        ipfsUrl,
        httpUrl,
        data
      });
      setTokenURI(ipfsUrl);
      return ipfsUrl;

    } catch (error) {
      console.error('Failed to upload to IPFS:', error);
      throw error;
    }
  }, [mintStatus.rank, mintStatus.score]);

  const mintNFT = useCallback(async (canvas: HTMLCanvasElement) => {
    if (!address) {
      notification.error("Please connect your wallet");
      return;
    }
    try {
      // 先上传到 IPFS
      const ipfsUrl = await uploadToIPFS(canvas);
      
      // 然后铸造 NFT
      await writeContractAsync({
        functionName: "mint",
        args: [ipfsUrl],  
        value: BigInt(100000000000000000),
      });
    } catch (error) {
      notification.error("Failed to mint NFT");
      throw error;
    }
  }, [writeContractAsync, address, uploadToIPFS]);

  // 监听铸造资格事件
  const { data: mintEligibleEvents } = useScaffoldEventHistory({
    contractName: "Minesweeper",
    eventName: "NFTMintEligible",
    fromBlock: startBlock,
    filters: { player: address },
    watch: true,
  });

  // 处理铸造资格事件
  useEffect(() => {
    if (mintEligibleEvents?.[0]?.args) {
      const { player, rank, score } = mintEligibleEvents[0].args as { player: string; rank: bigint; score: bigint };
      if (player.toLowerCase() === address?.toLowerCase()) {
        setMintStatus(prev => ({
          ...prev,
          canMint: true,
          rank: Number(rank),
          score: Number(score),
        }));
      }
    }
  }, [mintEligibleEvents, address]);

  // 更新状态
  useEffect(() => {
    if (canMint !== undefined && hasMinted !== undefined) {
      setMintStatus(prev => ({
        ...prev,
        canMint: canMint,
        hasMinted: hasMinted,
      }));
    }
  }, [canMint, hasMinted]);

  const generateNFTImage = useCallback((canvas: HTMLCanvasElement) => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // 设置画布大小为更小的尺寸
      canvas.width = 300;
      canvas.height = 300;

      // 设置背景
      const gradient = ctx.createRadialGradient(150, 150, 0, 150, 150, 150);
      gradient.addColorStop(0, "#4a90e2");
      gradient.addColorStop(1, "#2c3e50");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 绘制地雷
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2 - 30;

      // 绘制地雷阴影
      ctx.beginPath();
      ctx.arc(centerX + 5, centerY + 5, 40, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.fill();

      // 绘制地雷主体
      ctx.beginPath();
      ctx.arc(centerX, centerY, 40, 0, Math.PI * 2);
      ctx.fillStyle = "#34495e";
      ctx.fill();

      // 绘制地雷高光
      ctx.beginPath();
      ctx.arc(centerX - 15, centerY - 15, 15, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.2)";
      ctx.fill();

      // 绘制尖刺
      const spikes = 8;
      const spikeLength = 20;
      ctx.strokeStyle = "#34495e";
      ctx.lineWidth = 6;
      for (let i = 0; i < spikes; i++) {
        const angle = (i * 2 * Math.PI) / spikes;
        ctx.beginPath();
        ctx.moveTo(
          centerX + Math.cos(angle) * 40,
          centerY + Math.sin(angle) * 40
        );
        ctx.lineTo(
          centerX + Math.cos(angle) * (40 + spikeLength),
          centerY + Math.sin(angle) * (40 + spikeLength)
        );
        ctx.stroke();
      }

      // 绘制分数
      ctx.font = "bold 32px Arial";
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`Score: ${mintStatus.score}`, centerX, centerY + 80);

      // 添加标题
      ctx.font = "bold 20px Arial";
      ctx.fillText("Minesweeper Achievement", centerX, 40);
    
  }, [mintStatus.score]);

  return {
    mintStatus,
    mintNFT,
    tokenURI,
    generateNFTImage,
  };
}; 