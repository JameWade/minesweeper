// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "hardhat/console.sol";
import "./MinesweeperUtils.sol";

// NFT 合约接口
interface IMinesweeperNFT {
    function grantMintAccess(address player) external;
}

contract Minesweeper is ReentrancyGuard, Pausable, Ownable {
    using MinesweeperUtils for bytes32;

    // 修改 Move 结构体，移除 moveType
    struct Move {
        uint8 x;
        uint8 y;
    }

    // 游戏配置
    uint8 public constant WIDTH = 16;
    uint8 public constant HEIGHT = 16;
    uint256 public constant MAX_GAS_PER_TX = 500000;

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

    // 存储
    mapping(address => Game) public games;
    mapping(address => uint256) public highScores;

    // 新增玩家列表
    address[] public players;
    mapping(address => bool) public isPlayer; // 用于快速检查是否已是玩家

    event GameStarted(address indexed player, bytes32 boardHash, uint8 mineCount, uint256 timestamp);
    event CellRevealed(
        address indexed player,
        uint8 x,
        uint8 y,
        uint8 adjacentMines,
        bytes32 stateHash,
        uint256 moveCount
    );
    event GameOver(address indexed player, bool won, uint256 score, uint256 timeSpent);
    event BatchMoveProcessed(address indexed player, uint256 moveCount, bytes32 stateHash);
    event NFTMintEligible(address indexed player, uint256 rank, uint256 score);

    // NFT 合约地址
    address public nftContract;

    constructor() Ownable(msg.sender) {}

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // 开始新游戏
    function startNewGame(bytes32 salt) external whenNotPaused {
        bytes32 boardHash = MinesweeperUtils.generateBoard(salt);
        uint8 mineCount = MinesweeperUtils.countMines(boardHash);

        games[msg.sender] = Game({
            boardHash: boardHash,
            revealedMask: 0,
            startTime: block.timestamp,
            isOver: false,
            isStarted: true,
            score: 0,
            stateHash: boardHash,
            moveCount: 0,
            mineCount: mineCount,
            startBlock: block.number,
            hasWon: false
        });

        emit GameStarted(msg.sender, boardHash, mineCount, block.timestamp);
    }

    function processBatchMoves(Move[] calldata moves) external whenNotPaused nonReentrant {
        require(moves.length > 0, "No moves provided");
        require(moves.length <= 20, "Batch too large");

        uint8[] memory xCoords = new uint8[](moves.length);
        uint8[] memory yCoords = new uint8[](moves.length);
        for (uint256 i = 0; i < moves.length; i++) {
            xCoords[i] = moves[i].x;
            yCoords[i] = moves[i].y;
        }

        // bytes32 messageHash = keccak256(abi.encode(msg.sender, xCoords, yCoords));
        //require(MinesweeperUtils.verifySignature(messageHash, signature, msg.sender), "Invalid signature");

        Game storage game = games[msg.sender];
        require(!game.isOver, "Game is over");

        for (uint256 i = 0; i < moves.length; i++) {
            _executeMove(msg.sender, moves[i].x, moves[i].y);
            if (game.isOver) break;
        }

        emit BatchMoveProcessed(msg.sender, game.moveCount, game.stateHash);
    }

    // 内部函数：执行移动
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

    function _checkWin(Game storage game) internal view returns (bool) {
    // 将256位的revealedMask分成4个64位部分来处理
    uint256 x = game.revealedMask;

    // 分别计算4个64位块的汉明重量
    uint256 count1 = hamming_weight(x & 0xFFFFFFFFFFFFFFFF); // 低64位
    uint256 count2 = hamming_weight((x >> 64) & 0xFFFFFFFFFFFFFFFF); // 次低64位
    uint256 count3 = hamming_weight((x >> 128) & 0xFFFFFFFFFFFFFFFF); // 次高64位
    uint256 count4 = hamming_weight(x >> 192); // 高64位

    uint256 revealedCount = count1 + count2 + count3 + count4;

    console.log("revealedCount", revealedCount);
    uint256 area = uint256(WIDTH) * uint256(HEIGHT);
    uint256 targetCount = area - game.mineCount;
    return revealedCount == targetCount;
}

function hamming_weight(uint256 x) internal pure returns (uint256) {
    x = x - ((x >> 1) & 0x5555555555555555);
    x = (x & 0x3333333333333333) + ((x >> 2) & 0x3333333333333333);
    x = (x + (x >> 4)) & 0x0f0f0f0f0f0f0f0f;
    x = x + (x >> 8);
    x = x + (x >> 16);
    x = x + (x >> 32);
    return x & 0x7f; 
}

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

    // 提取合约中的ETH（仅限管理员）
    function withdraw() external onlyOwner {
        (bool success, ) = owner().call{ value: address(this).balance }("");
        require(success, "Withdrawal failed");
    }

    // 内部函数：计算得分
    function _calculateScore(Game storage game) internal view returns (uint256) {
        uint256 timeSpent = block.timestamp - game.startTime;

        uint256 score = 100; // 基础分

        if (timeSpent < 300) {
            // 5分钟内完成
            score += (300 - timeSpent) * 2; // 每提前1秒加2分
        } else if (timeSpent < 360) {
            score += (360 - timeSpent) * 1;
        } else if (timeSpent > 360 && timeSpent < 458) {
            score -= (timeSpent - 360) * 1; // 每晚1秒减1分
        } else {
            score = 1;    //最小赋值给1分吧，要是给0分，上不了排行榜。。。
        }
        return score;
    }

    receive() external payable {
        require(msg.sender == owner(), "Only owner can send ETH directly");
    }

    function getPlayers() external view returns (address[] memory) {
        return players;
    }

    function getScores(address[] calldata _players) external view returns (uint256[] memory) {
        uint256[] memory scores = new uint256[](_players.length);
        for (uint256 i = 0; i < _players.length; i++) {
            scores[i] = highScores[_players[i]];
        }
        return scores;
    }

    // 设置 NFT 合约地址
    function setNFTContract(address _nftContract) external onlyOwner {
        nftContract = _nftContract;
    }

    // 检查并通知 NFT 铸造资格 // 只需要找到玩家的排名
    function _checkAndNotifyNFT(address player, uint256 score) internal {
        uint256 rank = 1;
        for (uint256 i = 0; i < players.length; i++) {
            if (highScores[players[i]] > score) {
                rank++;
            }
        }
        if (rank <= 10) {
            IMinesweeperNFT(nftContract).grantMintAccess(player);
            emit NFTMintEligible(player, rank, score);
        }
    }
}
