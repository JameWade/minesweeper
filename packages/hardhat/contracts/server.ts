import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { parseAbi } from 'viem';
import { hardhat } from 'viem/chains';
import { ethers } from 'ethers';

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

// 环境变量检查
const PRIVATE_KEY = process.env.RELAYER_PRIVATE_KEY;
const RPC_URL = process.env.RPC_URL;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;

if (!PRIVATE_KEY || !RPC_URL || !CONTRACT_ADDRESS) {
    throw new Error('Missing environment variables');
}

// 创建账户
const account = privateKeyToAccount(`0x${PRIVATE_KEY}`);

// 创建客户端
const publicClient = createPublicClient({
    chain: hardhat,
    transport: http(RPC_URL),
});

const walletClient = createWalletClient({
    account,
    chain: hardhat,
    transport: http(RPC_URL),
});

// 合约 ABI
const abi = parseAbi([
    'function relayedReveal(address player, uint8 x, uint8 y, bytes memory signature) external',
    'function relayedFlag(address player, uint8 x, uint8 y, bytes memory signature) external',
]);

// 添加类型定义
interface RevealRequest {
    player: string;
    x: number;
    y: number;
    signature: string;
}

// 添加请求验证中间件
const validateRequest = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const { player, x, y, signature } = req.body;
    if (!player || !ethers.isAddress(player)) {
        return res.status(400).json({ success: false, error: 'Invalid player address' });
    }
    if (typeof x !== 'number' || typeof y !== 'number' || x < 0 || x >= 16 || y < 0 || y >= 16) {
        return res.status(400).json({ success: false, error: 'Invalid coordinates' });
    }
    if (!signature || typeof signature !== 'string') {
        return res.status(400).json({ success: false, error: 'Invalid signature' });
    }
    next();
};

// 使用验证中间件
app.post('/relay/reveal', validateRequest, async (req: express.Request<{}, {}, RevealRequest>, res) => {
    try {
        const { player, x, y, signature } = req.body;
        
        // 发送交易
        const hash = await walletClient.writeContract({
            address: CONTRACT_ADDRESS as `0x${string}`,
            abi,
            functionName: 'relayedReveal',
            args: [player, x, y, signature],
            gas: 500000n,
        });

        // 等待交易确认
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        
        res.json({
            success: true,
            txHash: receipt.transactionHash,
            blockNumber: receipt.blockNumber
        });
    } catch (error) {
        console.error('Relay reveal failed:', error);
        res.status(500).json({ success: false, error: String(error) });
    }
});

// 处理标记地雷请求
app.post('/relay/flag', async (req, res) => {
    try {
        const { player, x, y, signature } = req.body;
        
        // 基本参数验证
        if (!player || x === undefined || y === undefined || !signature) {
            return res.status(400).json({ success: false, error: 'Missing parameters' });
        }
        
        // 发送交易
        const hash = await walletClient.writeContract({
            address: CONTRACT_ADDRESS as `0x${string}`,
            abi,
            functionName: 'relayedFlag',
            args: [player, x, y, signature],
        });

        // 等待交易确认
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        
        res.json({
            success: true,
            txHash: receipt.transactionHash,
            blockNumber: receipt.blockNumber
        });
    } catch (error) {
        console.error('Relay flag failed:', error);
        res.status(500).json({ success: false, error: String(error) });
    }
});

// 错误处理中间件
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Relayer service running on port ${PORT}`);
});

// 优雅关闭
process.on('SIGTERM', () => {
    console.log('SIGTERM received. Closing server...');
    process.exit(0);
});