// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "hardhat/console.sol";
import "./MinesweeperUtils.sol";

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
    uint8 public constant MINE_COUNT = 40;
    uint256 public constant SESSION_DURATION = 1 hours;
    uint256 public constant MAX_GAS_PER_TX = 500000;

    struct Game {
        bytes32 boardHash;
        uint256 revealedMask;
        uint256 startTime;
        bool isOver;
        uint256 score;
        bytes32 stateHash;
        uint256 moveCount;
    }

    struct Session {
        address player;
        uint256 expiryTime;
        bytes32 nonce;
        bytes32 lastHash;
        uint256 lastActionTime;
        uint256 remainingGas;
    }

    // 存储
    mapping(address => Game) public games;
    mapping(address => Session) public sessions;
    mapping(address => uint256) public playerGames;

    // 事件
    event GameStarted(address indexed player, bytes32 boardHash, uint256 timestamp);
    event CellRevealed(
        address indexed player,
        uint8 x,
        uint8 y,
        uint8 adjacentMines,
        bytes32 stateHash,
        uint256 moveCount
    );
    event GameOver(address indexed player, bool won, uint256 score, uint256 timeSpent);
    event SessionCreated(address indexed player, uint256 expiryTime, bytes32 nonce);
    event BatchMoveProcessed(address indexed player, uint256 moveCount, bytes32 stateHash);


    constructor() Ownable(msg.sender) {}

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // 创建游戏会话
    function createSession() external payable whenNotPaused {
        require(msg.value >= 0.01 ether, "Insufficient payment");

        bytes32 nonce = keccak256(abi.encodePacked(msg.sender, block.timestamp, block.number, block.prevrandao));

        unchecked {
            sessions[msg.sender] = Session({
                player: msg.sender,
                expiryTime: block.timestamp + SESSION_DURATION,
                nonce: nonce,
                lastHash: keccak256(abi.encodePacked(nonce)),
                lastActionTime: block.timestamp,
                remainingGas: msg.value / tx.gasprice
            });
        }

        emit SessionCreated(msg.sender, block.timestamp + SESSION_DURATION, nonce);
    }

    // 开始新游戏
    function startNewGame(bytes32 salt) external whenNotPaused {
        require(!games[msg.sender].isOver, "Finish current game first");
        require(sessions[msg.sender].expiryTime > block.timestamp, "Session expired");

        bytes32 boardHash = MinesweeperUtils.generateBoard(salt);
        
        

        // 初始化状态哈希
        bytes32 initialStateHash = keccak256(abi.encode(boardHash, games[msg.sender].revealedMask));

        games[msg.sender] = Game({
            boardHash: boardHash,
            revealedMask: 0,
            startTime: block.timestamp,
            isOver: false,
            score: 0,
            stateHash: initialStateHash,
            moveCount: 0
        });
        emit GameStarted(msg.sender, boardHash, block.timestamp);
    }

    // 修改 processBatchMoves 函数
    function processBatchMoves(Move[] calldata moves, bytes memory signature) external whenNotPaused nonReentrant {
        Session storage session = sessions[msg.sender];
        require(block.timestamp < session.expiryTime, "Session expired");
        require(session.remainingGas >= MAX_GAS_PER_TX, "Insufficient gas");
        require(moves.length > 0, "No moves provided");
        require(moves.length <= 20, "Batch too large");

        uint256 gasStart = gasleft();

        // 将 moves 转换为两个数组
        uint8[] memory xCoords = new uint8[](moves.length);
        uint8[] memory yCoords = new uint8[](moves.length);
        for (uint256 i = 0; i < moves.length; i++) {
            xCoords[i] = moves[i].x;
            yCoords[i] = moves[i].y;
        }

        bytes32 messageHash = keccak256(abi.encode(msg.sender, xCoords, yCoords, session.nonce, session.lastHash));
        
    
        console.logBytes32( session.nonce);
        console.logBytes32( session.lastHash);
        console.logBytes32(messageHash);
        require(MinesweeperUtils.verifySignature(messageHash, signature, msg.sender), "Invalid signature");

        Game storage game = games[msg.sender];
        require(!game.isOver, "Game is over");

        for (uint256 i = 0; i < moves.length; i++) {
            _executeMove(msg.sender, moves[i].x, moves[i].y);
            if (game.isOver) break;
        }

        uint256 gasUsed = gasStart - gasleft();
        session.remainingGas -= gasUsed;
        session.lastHash = messageHash;
        session.lastActionTime = block.timestamp;


        emit BatchMoveProcessed(msg.sender, game.moveCount, game.stateHash);
    }

    // 内部函数：执行移动
    function _executeMove(address player, uint8 x, uint8 y) internal {
        Game storage game = games[player];
        require(!game.isOver, "Game is over");
        require(x < WIDTH && y < HEIGHT, "Invalid coordinates");

        // 确保 moveCount 不会溢出
        require(game.moveCount < type(uint256).max, "Move count overflow");

        uint256 bitIndex = uint256(y) * WIDTH + uint256(x);
        require(bitIndex < 256, "Bit index overflow");

        bool isEmptyCell = _revealCell(game, x, y);
        // 只有当是空白格子（没有相邻地雷）时才展开
        if (isEmptyCell) {
            _revealArea(game, x, y);
        }

        if (_checkWin(game)) {
            game.isOver = true;
            game.score = _calculateScore(game);
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
            emit GameOver(msg.sender, false, 0, block.timestamp - game.startTime);
            return false;
        }
    }

    // 内部函数：检查是否胜利
    function _checkWin(Game storage game) internal view returns (bool) {
        uint256 revealedCount = 0;

        uint256 mask = game.revealedMask;
        while (mask != 0) {
            if ((mask & 1) != 0) {
                revealedCount++;
            }
            mask = mask >> 1;
        }
        uint256 area = uint256(WIDTH) * uint256(HEIGHT);
        uint256 targetCount = area - MINE_COUNT;
        return revealedCount == targetCount;
    }

    function _revealArea(Game storage game, uint8 x, uint8 y) internal {
        uint256 bitIndex = uint256(y) * WIDTH + uint256(x);
        if ((game.revealedMask & (1 << bitIndex)) != 0) {
            return;
        }

        // 揭示当前格子，如果不是空白格子，直接返回
        if (!_revealCell(game, x, y)) {
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
        uint256 baseScore = 10000;

        if (timeSpent >= baseScore) return 1000;
        return baseScore - timeSpent;
    }

    // 修改 receive 函数
    receive() external payable {
        require(msg.sender == owner(), "Only owner can send ETH directly");
    }

    // 添加一个查询 session 的函数
    function getSession(address player) external view returns (
        address sessionPlayer,
        uint256 expiryTime,
        bytes32 nonce,
        bytes32 lastHash,
        uint256 lastActionTime,
        uint256 remainingGas
    ) {
        Session storage session = sessions[player];
        return (
            session.player,
            session.expiryTime,
            session.nonce,
            session.lastHash,
            session.lastActionTime,
            session.remainingGas
        );
    }
}
