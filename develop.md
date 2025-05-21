# 简介
项目是一个基于evm的扫雷游戏（Minesweeper）智能合约，支持玩家自行启动游戏、批量点击格子进行探索，同时根据成绩授予 NFT 铸造资格。项目开发过程中借助了强大的ai支持，大佬勿喷。
# 环境搭建
项目使用的是 `Scaffold-ETH 2`模板进行开发，合约开发框架使用的是hardhat,前端使用nextjs，安装前确保电脑安装了nodejs.我用的版本是 `v20.12.1`
```
npx create-eth@latest
```
# 智能合约开发
一共有三个合约 `Minesweeper.sol`,`MinesweeperNFT.sol`,`MinesweeperUtil.sol`
## MinesweeperUtils
1. generateBoard

用`block.timestamp`,`block.number`,`block.prevrandao`和前端提供的`salt`作为参数调用`keccak256`函数生成一个256位的随即数。
```
 function generateBoard(bytes32 salt) internal view returns (bytes32) {
        return keccak256(abi.encodePacked(
            block.timestamp,
            block.number,
            block.prevrandao,
            salt
        ));
    }
```
2. isMine

判读格子是否是地雷，这个地方是一个动态判断，用棋盘的哈希 + 当前格子的 (x, y) 坐标打包，再哈希一遍，得到一个新的 32 字节随机值，跟当前位置唯一对应。把哈希当成一个大整数，然后模上总格子数。结果是 `[0, maxMinePositions-1]` 之间的一个数。如果模的结果小于地雷数（MINE_COUNT），那么这格就是雷。但是这样只能保证实际地雷数在`MINE_COUNT`附近，不是正好是`MINE_COUNT`个雷。
```
function isMine(bytes32 boardHash, uint8 x, uint8 y) internal pure returns (bool) {
        bytes32 positionHash = keccak256(abi.encodePacked(boardHash, x, y));
        uint256 maxMinePositions = uint256(WIDTH) * uint256(HEIGHT);
        return uint256(positionHash) % maxMinePositions < MINE_COUNT;
    }
```
3. getAdjacentMines

用于计算给定一个位置，紧邻8个格子的地雷数。
```
  function getAdjacentMines(bytes32 boardHash, uint8 x, uint8 y) internal pure returns (uint8) {
        uint8 count = 0;
        
        for (int8 i = -1; i <= 1; i++) {
            for (int8 j = -1; j <= 1; j++) {
                if (i == 0 && j == 0) continue;
                
                int8 newX = int8(x) + i;
                int8 newY = int8(y) + j;
                
                if (newX >= 0 && newX < int8(WIDTH) && newY >= 0 && newY < int8(HEIGHT)) {
                    if (isMine(boardHash, uint8(newX), uint8(newY))) {
                        count++;
                    }
                }
            }
        }
        
        return count;
    }
```
## Minesweeper.sol
### 主要数据结构
1. Move 用于描述玩家一次点击操作的坐标。
```
struct Move {
    uint8 x;
    uint8 y;
}
```
2. Game记录一局扫雷游戏的状态

地图大小是16*16=256个格子，可以用一个uint8整数的每一位表示整个棋盘，revealedMask是一个位图用于表示玩家已经揭开的地雷，mineCount是地雷数量，因为是用了随机算法，所以每一局的地雷数不是固定不变的。
```
struct Game {
    bytes32 boardHash;   
    uint256 revealedMask;  
    uint256 startTime;
    bool isOver;
    bool isStarted;
    uint256 score;
    bytes32 stateHash;
    uint256 moveCount;
    uint8 mineCount;
    uint256 startBlock;
    bool hasWon;
}
```
### 核心函数
1. processBatchMoves

接收玩家点击的多个格子，循环揭开每个格子
```
function processBatchMoves(Move[] calldata moves) external whenNotPaused nonReentrant {
        require(moves.length > 0, "No moves provided");
        require(moves.length <= 20, "Batch too large");

        uint8[] memory xCoords = new uint8[](moves.length);
        uint8[] memory yCoords = new uint8[](moves.length);
        for (uint256 i = 0; i < moves.length; i++) {
            xCoords[i] = moves[i].x;
            yCoords[i] = moves[i].y;
        }

        Game storage game = games[msg.sender];
        require(!game.isOver, "Game is over");

        for (uint256 i = 0; i < moves.length; i++) {
            _executeMove(msg.sender, moves[i].x, moves[i].y);
            if (game.isOver) break;
        }

        emit BatchMoveProcessed(msg.sender, game.moveCount, game.stateHash);
    }
```
2. _executeMove 
点击格子调用`_revealArea`揭开这个格子以及这个格子相邻的区域。然后调用`_checkWin`函数检查是否游戏结束，如果玩家胜利，调用`_checkAndNotifyNFT`函数赋予玩家一个mint nft的权限。
```
function _executeMove(address player, uint8 x, uint8 y) internal {
        Game storage game = games[player];
        require(!game.isOver, "Game is over");
        require(x < WIDTH && y < HEIGHT, "Invalid coordinates");

        _revealArea(game, x, y);

        if (_checkWin(game)) {
            game.isOver = true;
            game.hasWon = true;
            game.isStarted = false; // 重置游戏开始状态
            game.score = _calculateScore(game);

            // 更新最高分并添加到玩家列表
            if (game.score > highScores[player]) {
                highScores[player] = game.score;

                if (!isPlayer[player]) {
                    players.push(player);
                    isPlayer[player] = true;
                }
                // 检查并通知 NFT 铸造资格
                _checkAndNotifyNFT(player, game.score);
            }

            emit GameOver(player, true, game.score, block.timestamp - game.startTime);
        }
    }
```
3. _revealArea
调用`_revealCell`判断自身是否无雷，如果无雷，继续递归遍历这个格子四周是否无雷，如果无雷就全部揭开。这里要注意递归遍历过程要考虑到棋盘的4个边界不能越界。这个递归算法的gas应该还有很大优化空间，应该可以改成基于栈的算法进行优化。我不确定，希望大佬可以指点下。
```
function _revealArea(Game storage game, uint8 x, uint8 y) internal {
        uint256 bitIndex = uint256(y) * WIDTH + uint256(x);

        if ((game.revealedMask & (1 << bitIndex)) != 0) {
            return;
        }

        bool isEmpty = _revealCell(game, x, y);

        if (!isEmpty) {
            return;
        }

        // 直接检查相邻格子
        for (int8 i = -1; i <= 1; i++) {
            for (int8 j = -1; j <= 1; j++) {
                if (i == 0 && j == 0) continue;

                // 避免负数溢出
                if (i < 0 && uint8(-i) > x) continue;
                if (j < 0 && uint8(-j) > y) continue;

                // 避免正数溢出
                if (i > 0 && x >= WIDTH - uint8(i)) continue;
                if (j > 0 && y >= HEIGHT - uint8(j)) continue;

                uint8 newX = i < 0 ? x - uint8(-i) : x + uint8(i);
                uint8 newY = j < 0 ? y - uint8(-j) : y + uint8(j);

                _revealArea(game, newX, newY);
            }
        }
    }
 ```
 4. _revealCell

 揭开格子，这里会调用`MinesweeperUtils`的`getAdjacentMines`函数判断周围雷数，必须周围没有雷，返回到`_revealArea`的`isEmpty`才是空，才会继续揭开周围格子。
 ```
 function _revealCell(Game storage game, uint8 x, uint8 y) internal returns (bool) {
        uint256 bitIndex = uint256(y) * WIDTH + uint256(x);
        require(bitIndex < 256, "Bit index overflow");

        if ((game.revealedMask & (1 << bitIndex)) != 0) {
            return false;
        }

        unchecked {
            game.revealedMask |= (1 << bitIndex);
        }

        game.moveCount++;
        if (!MinesweeperUtils.isMine(game.boardHash, x, y)) {
            uint8 adjacentMines = MinesweeperUtils.getAdjacentMines(game.boardHash, x, y);
            unchecked {
                game.stateHash = keccak256(abi.encode(game.revealedMask, game.moveCount));
            }
            emit CellRevealed(msg.sender, x, y, adjacentMines, game.stateHash, game.moveCount);

            return adjacentMines == 0;
        } else {
            game.isOver = true;
            game.hasWon = false;
            game.isStarted = false; // 重置游戏开始状态
            emit GameOver(msg.sender, false, 0, block.timestamp - game.startTime);
            return false;
        }
    }
```
5. checkwin

用于判断玩家是否胜利,就是判断是否所有的非雷格子都被揭开。为了优化gas,这里用的是汉明重量算法来计算一个二进制数字中1的个数。我本来想让ai直接处理256位，但是我试了几次都出错了，我就把256位拆成4个64位分别计算然后加和处理的。
```
    function _checkWin(Game storage game) internal view returns (bool) {
    // 将256位的revealedMask分成4个64位部分来处理
    uint256 x = game.revealedMask;

    // 分别计算4个64位块的汉明重量
    uint256 count1 = hamming_weight(x & 0xFFFFFFFFFFFFFFFF); // 低64位
    uint256 count2 = hamming_weight((x >> 64) & 0xFFFFFFFFFFFFFFFF); // 次低64位
    uint256 count3 = hamming_weight((x >> 128) & 0xFFFFFFFFFFFFFFFF); // 次高64位
    uint256 count4 = hamming_weight(x >> 192); // 高64位

    uint256 revealedCount = count1 + count2 + count3 + count4;

    uint256 area = uint256(WIDTH) * uint256(HEIGHT);
    uint256 targetCount = area - game.mineCount;
    return revealedCount == targetCount;
}
```
6. hamming_weight

hamming_weight算法,参考这篇博客 [variable precision SWAR算法](https://ivanzz1001.github.io/records/post/data-structure/2018/09/04/ds-variable-precision-SWAR)

```
function hamming_weight(uint256 x) internal pure returns (uint256) {
    x = x - ((x >> 1) & 0x5555555555555555);
    x = (x & 0x3333333333333333) + ((x >> 2) & 0x3333333333333333);
    x = (x + (x >> 4)) & 0x0f0f0f0f0f0f0f0f;
    x = x + (x >> 8);
    x = x + (x >> 16);
    x = x + (x >> 32);
    return x & 0x7f; 
}
```
## MinesweeperNFT合约
这个比较简单，基本都是继承的openzeppelin的ERC721标准合约
1. onlyMinesweeperGame 

定义一个`onlyMinesweeperGame`修饰符，确保调用者必须是`minesweeperGame`合约
```
modifier onlyMinesweeperGame() {
        require(msg.sender == minesweeperGame, "Only Minesweeper game can call");
        _;
    }
```
2. grantMintAccess

授予符合条件的玩家铸造权限，由`onlyMinesweeperGame`修饰，确保只有`minesweeperGame`可以调用
```
function grantMintAccess(address player) external onlyMinesweeperGame {
        canMint[player] = true;
    }
```
3. mint 

mint nft
```
function mint(string memory _tokenURI) external payable {
        require(canMint[msg.sender], "Not eligible to mint");
        require(!hasMinted[msg.sender], "Already minted");
        require(msg.value >= MINT_PRICE, "Insufficient payment");

        uint256 tokenId = totalSupply + 1;
        totalSupply++;
        hasMinted[msg.sender] = true;
        canMint[msg.sender] = false;

        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, _tokenURI);
    }
```

## 部署合约
在 hardhat.config.ts 中配置 monadTestnet 网络

```
monadTestnet: {
      url: "https://testnet-rpc.monad.xyz",
      accounts: [deployerPrivateKey],
      chainId: 10143
    },
```

然后设置部署账户

```
yarn account:import
```


最后部署
```
yarn deploy --network monadTestnet
```
# 前端开发
前端这里有个坑就是一开始用的`useScaffoldWatchContractEvent`和`useScaffoldEventHistory`这两个函数去监听合约事件，结果我代码都写完了，本地节点运行都没问题，结果用monad的rpc一直给我报一个429。然后我打开控制台一看，这玩意会一直疯狂的请求rpc，然后导致rpc报了这个错误。然后我就改用了`useScaffoldReadContract`这个函数读取一次合约，之后每次调用`useScaffoldWriteContract`合约修改区块状态之后通过`useWaitForTransactionReceipt`拿到`Receipt`后去处理`Receipt`中的日志，这样就不会出现大量调用rpc的情况。

跟合约交互大概就是上面这些函数，`useScaffoldReadContract`读，`useScaffoldWriteContract`写，`useWaitForTransactionReceipt`处理交易收据日志修改前端状态和UI.

说一个有意思的东西就是让ai写了一个自制扫雷图片NFT的代码
## 扫雷NFT
当玩家胜利一局游戏同时打破自己的最高分记录会获得铸造一个当前分数对应NFT的权限，然后这里是在前端画的一个NFT图片。
1. generateNFTImage
```
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
```
2. uploadToIPFS

上传到IPFS
```
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
```
3. mintNFT

```
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
```

## 前端发布配置

```
touch packages/nextjs/utils/scaffold-eth/customChains.ts
```
编辑customChains.ts文件

```
import { defineChain } from "viem";

// monad testnet chain
export const monadTestnet = defineChain({
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: {
    default: {
      http: ["https://testnet-rpc.monad.xyz"],
    },
  },
  blockExplorers: {
    default: {
      name: "Monad Explorer",
      url: "https://testnet.monadexplorer.com/",
    },
  },
});
```
修改packages/nextjs/scaffold.config.ts

```
//   targetNetworks: [chains.hardhat], 改成
targetNetworks: [monadTestnet],
```
最后运行前端，可以开心交互了。。。。。
```
yarn start
```