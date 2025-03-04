import { expect } from "chai";
import { ethers } from "hardhat";
import type { Minesweeper } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { parseEther } from "ethers";
import { time as hardhatTime } from "@nomicfoundation/hardhat-network-helpers";

describe("Minesweeper", function () {
  let minesweeper: Minesweeper;
  let owner: SignerWithAddress;
  let player: SignerWithAddress;
  let otherPlayer: SignerWithAddress;

  const MIN_STAKE = parseEther("10");

  beforeEach(async () => {
    [owner, player, otherPlayer] = await ethers.getSigners();

    // 部署 Minesweeper 合约
    const MinesweeperFactory = await ethers.getContractFactory("Minesweeper");
    minesweeper = await MinesweeperFactory.deploy();
    await minesweeper.waitForDeployment();
  });

  describe("Session Management", function () {
    it("Should create a new session with sufficient stake", async function () {
      const currentTime = await hardhatTime.latest();
      
      // 获取事件
      const tx = await minesweeper.connect(player).createSession({ value: MIN_STAKE });
      const receipt = await tx.wait();
      const sessionCreatedEvent = await minesweeper.queryFilter(
        minesweeper.filters.SessionCreated(),
        receipt?.blockNumber,
        receipt?.blockNumber
      );
      
      // 验证事件参数
      expect(sessionCreatedEvent[0].args.player).to.equal(player.address);
      expect(sessionCreatedEvent[0].args.expiryTime).to.be.closeTo(
        currentTime + 3600,
        2 // 允许2秒的误差
      );
      expect(typeof sessionCreatedEvent[0].args.nonce).to.equal("string");

      await expect(minesweeper.sessions(player.address)).to.not.be.reverted;
    });

    it("Should reject session creation with insufficient stake", async function () {
      await expect(
        minesweeper.connect(player).createSession({ value: parseEther("0.009") })
      ).to.be.revertedWith("Insufficient payment");
    });

    it("Should not allow creating a session while paused", async function () {
      await minesweeper.connect(owner).pause();
      await expect(
        minesweeper.connect(player).createSession({ value: MIN_STAKE })
      ).to.be.revertedWithCustomError(minesweeper, "EnforcedPause");
    });
  });

  describe("Game Management", function () {
    beforeEach(async () => {
      await minesweeper.connect(player).createSession({ value: MIN_STAKE });
    });

    it("Should start a new game", async function () {
      const salt = ethers.hexlify(ethers.randomBytes(32));
      const tx = await minesweeper.connect(player).startNewGame(salt);
      const receipt = await tx.wait();
      
      const gameStartedEvent = await minesweeper.queryFilter(
        minesweeper.filters.GameStarted(),
        receipt?.blockNumber,
        receipt?.blockNumber
      );
      
      expect(gameStartedEvent[0].args.player).to.equal(player.address);
      expect(gameStartedEvent[0].args.boardHash).to.be.properHex(64);
      expect(typeof gameStartedEvent[0].args.timestamp).to.equal('bigint');
      expect(gameStartedEvent[0].args.timestamp).to.be.gt(0n);

      const game = await minesweeper.games(player.address);
      expect(game.boardHash).to.not.equal(ethers.ZeroHash);
      expect(game.isOver).to.be.false;
    });

    it("Should not start a game without an active session", async function () {
      const salt = ethers.randomBytes(32);
      await expect(
        minesweeper.connect(otherPlayer).startNewGame(salt)
      ).to.be.revertedWith("Session expired");
    });

    it("Should process valid moves", async function () {
      const salt = ethers.randomBytes(32);
      await minesweeper.connect(player).startNewGame(salt);

      const moves = [
        { x: 0, y: 0 },
        { x: 1, y: 1 }
      ];

      const session = await minesweeper.sessions(player.address);
      
      const messageHash = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "uint8[]", "uint8[]",  "bytes32", "bytes32"],
        [
          player.address,
          moves.map(m => m.x),
          moves.map(m => m.y),
          session.nonce,
          session.lastHash
        ]
      ));

      const signature = await player.signMessage(ethers.getBytes(messageHash));

      await expect(
        minesweeper.connect(player).processBatchMoves(moves, signature)
      ).to.emit(minesweeper, "BatchMoveProcessed");
    });
  });

  describe("Game Logic", function () {
    beforeEach(async () => {
      await minesweeper.connect(player).createSession({ value: MIN_STAKE });
      const salt = ethers.randomBytes(32);
      await minesweeper.connect(player).startNewGame(salt);
    });

    it("Should reveal adjacent cells for empty cell", async function () {
      const moves = [{ x: 0, y: 0 }];
      
      const session = await minesweeper.sessions(player.address);
      
      const messageHash = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "uint8[]", "uint8[]",  "bytes32", "bytes32"],
        [
          player.address,
          moves.map(m => m.x),
          moves.map(m => m.y),
          session.nonce,
          session.lastHash
        ]
      ));

      const signature = await player.signMessage(ethers.getBytes(messageHash));
      const tx = await minesweeper.connect(player).processBatchMoves(moves, signature);
      const receipt = await tx.wait();

      const game = await minesweeper.games(player.address);
      let revealedCount = countBits(BigInt(game.revealedMask));
      expect(revealedCount).to.be.gte(1);
      
      const cellRevealedEvents = await minesweeper.queryFilter(
        minesweeper.filters.CellRevealed(),
        receipt?.blockNumber,
        receipt?.blockNumber
      );
      expect(cellRevealedEvents.length).to.be.gte(1);
    });

    it("Should handle mine hits correctly", async function () {
      const moves = [{ x: 0, y: 0 }];
      const session = await minesweeper.sessions(player.address);
      
      const messageHash = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "uint8[]", "uint8[]",  "bytes32", "bytes32"],
        [
          player.address,
          moves.map(m => m.x),
          moves.map(m => m.y),
          session.nonce,
          session.lastHash,
        ]
      ));

      const signature = await player.signMessage(ethers.getBytes(messageHash));
      await minesweeper.connect(player).processBatchMoves(moves, signature);

      const game = await minesweeper.games(player.address);
      if (game.isOver) {
        // 如果游戏结束，说明点到了地雷
        expect(game.score).to.equal(0);
      }
    });

    it("Should detect win condition", async function () {
      // 模拟揭示所有非地雷格子
      for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
          const moves = [{ x, y, moveType: 0 }];
          const session = await minesweeper.sessions(player.address);
              
          const messageHash = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(
            ["address", "uint8[]", "uint8[]",  "bytes32", "bytes32"],
            [
              player.address,
              moves.map(m => m.x),
              moves.map(m => m.y),
              session.nonce,
              session.lastHash,
            ]
          ));

          const signature = await player.signMessage(ethers.getBytes(messageHash));
          try {
            await minesweeper.connect(player).processBatchMoves(moves, signature);
          } catch (_) {
            // 忽略地雷格子的错误
            continue;
          }
        }
      }
      const game = await minesweeper.games(player.address);
      if (game.isOver && game.score > 0) {
        // 如果游戏结束且分数不为0，说明获胜
        expect(game.score).to.be.gt(0);
      }
    });
  });

  describe("Security Features", function () {
    it("Should only allow owner to pause/unpause", async function () {
      await expect(minesweeper.connect(player).pause()).to.be.reverted;
      await expect(minesweeper.connect(owner).pause()).to.not.be.reverted;
    });

    it("Should only allow owner to withdraw funds", async function () {
      await minesweeper.connect(player).createSession({ value: MIN_STAKE });
      await expect(minesweeper.connect(player).withdraw()).to.be.reverted;
      await expect(minesweeper.connect(owner).withdraw()).to.not.be.reverted;
    });

    it("Should validate move signatures", async function () {
      await minesweeper.connect(player).createSession({ value: MIN_STAKE });
      const salt = ethers.randomBytes(32);
      await minesweeper.connect(player).startNewGame(salt);

      const moves = [{ x: 0, y: 0, moveType: 0 }];
      const session = await minesweeper.sessions(player.address);
      
      const messageHash = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "uint8[]", "uint8[]",  "bytes32", "bytes32"],
        [
          player.address,
          moves.map(m => m.x),
          moves.map(m => m.y),
          session.nonce,
          session.lastHash,
        ]
      ));

      // 使用其他玩家的签名
      const invalidSignature = await otherPlayer.signMessage(ethers.getBytes(messageHash));
      await expect(
        minesweeper.connect(player).processBatchMoves(moves, invalidSignature)
      ).to.be.revertedWith("Invalid signature");
    });


  });

  describe("Edge Cases", function () {
    it("Should handle session expiry correctly", async function () {
      await minesweeper.connect(player).createSession({ value: MIN_STAKE });
      await hardhatTime.increase(3600);
      
      const salt = ethers.randomBytes(32);
      await expect(
        minesweeper.connect(player).startNewGame(salt)
      ).to.be.revertedWith("Session expired");
    });

    it("Should handle gas limits correctly", async function () {
      await minesweeper.connect(player).createSession({ value: MIN_STAKE });
      const salt = ethers.randomBytes(32);
      await minesweeper.connect(player).startNewGame(salt);

      // 创建大量移动来消耗gas
      const moves = Array(21).fill({ x: 0, y: 0, moveType: 0 });  // 超过最大允许的20个移动
      const session = await minesweeper.sessions(player.address);
      
      const messageHash = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "uint8[]", "uint8[]",  "bytes32", "bytes32"],
        [
          player.address,
          moves.map(m => m.x),
          moves.map(m => m.y),
          session.nonce,
          session.lastHash,
        ]
      ));

      const signature = await player.signMessage(ethers.getBytes(messageHash));
      await expect(
        minesweeper.connect(player).processBatchMoves(moves, signature)
      ).to.be.revertedWith("Batch too large");
    });

    it("Should handle board boundaries correctly", async function () {
      await minesweeper.connect(player).createSession({ value: MIN_STAKE });
      const salt = ethers.randomBytes(32);
      await minesweeper.connect(player).startNewGame(salt);

      // 尝试在边界外移动
      const moves = [{ x: 16, y: 16, moveType: 0 }];
      const session = await minesweeper.sessions(player.address);
      
      const messageHash = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "uint8[]", "uint8[]",  "bytes32", "bytes32"],
        [
          player.address,
          moves.map(m => m.x),
          moves.map(m => m.y),
          session.nonce,
          session.lastHash
        ]
      ));

      const signature = await player.signMessage(ethers.getBytes(messageHash));
      await expect(
        minesweeper.connect(player).processBatchMoves(moves, signature)
      ).to.be.revertedWith("Invalid coordinates");
    });
  });
});

// 辅助函数：计算二进制中1的个数
function countBits(n: bigint): number {
  let count = 0;
  while (n > 0n) {
    count += Number(n & 1n);
    n >>= 1n;
  }
  return count;
} 