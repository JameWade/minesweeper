// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "hardhat/console.sol";
library MinesweeperUtils {
    // 添加缺失的常量
    uint8 internal constant WIDTH = 16;
    uint8 internal constant HEIGHT = 16;
    uint8 internal constant MINE_COUNT = 40;

    function isMine(bytes32 boardHash, uint8 x, uint8 y) internal pure returns (bool) {
        bytes32 positionHash = keccak256(abi.encodePacked(boardHash, x, y));
        uint256 maxMinePositions = uint256(WIDTH) * uint256(HEIGHT);
        return uint256(positionHash) % maxMinePositions < MINE_COUNT;
    }
    
    // 生成棋盘布局
    function generateBoard(bytes32 salt) internal view returns (bytes32) {
        return keccak256(abi.encodePacked(
            block.timestamp,
            block.number,
            block.prevrandao,
            salt
        ));
    }
    
    // 获取周围地雷数
    function getAdjacentMines(bytes32 boardHash, uint8 x, uint8 y) internal pure returns (uint8) {
        uint8 count = 0;
        
        for (int8 i = -1; i <= 1; i++) {
            for (int8 j = -1; j <= 1; j++) {
                if (i == 0 && j == 0) continue;
                
                int8 newX = int8(x) + i;
                int8 newY = int8(y) + j;
                
                if (newX >= 0 && newX < int8(WIDTH) && newY >= 0 && newY < int8(HEIGHT)) {
                    console.log("Checking adjacent cell - x: %s, y: %s", uint8(newX), uint8(newY));
                    if (isMine(boardHash, uint8(newX), uint8(newY))) {
                        console.log("Found mine at x: %s, y: %s", uint8(newX), uint8(newY));
                        count++;
                    }
                }
            }
        }
        
        return count;
    }
    
    // 验证签名
    function verifySignature(
        bytes32 messageHash,
        bytes memory signature,
        address signer
    ) internal pure returns (bool) {
        // 先计算 EIP-191 签名消息
        bytes32 ethSignedMessageHash = keccak256(abi.encodePacked(
            "\x19Ethereum Signed Message:\n32",
            messageHash
        ));
        
        (bytes32 r, bytes32 s, uint8 v) = splitSignature(signature);
        // 修复 v 值
        if (v < 27) v += 27;
        
        address recoveredSigner = ecrecover(ethSignedMessageHash, v, r, s);
        
        
        return recoveredSigner == signer;
    }
    
    // 分割签名
    function splitSignature(bytes memory sig) internal pure returns (bytes32 r, bytes32 s, uint8 v) {
        require(sig.length == 65, "Invalid signature length");
        
        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }
    }

    


}