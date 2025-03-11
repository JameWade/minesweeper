// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract MinesweeperNFT is ERC721URIStorage, Ownable {
    using Strings for uint256;
    
    // 记录已铸造的 NFT 数量
    uint256 public totalSupply;
    
    // 记录玩家是否已经铸造过 NFT
    mapping(address => bool) public hasMinted;
    
    // 只允许扫雷游戏合约调用
    address public minesweeperGame;
    
    // 记录哪些玩家有资格铸造
    mapping(address => bool) public canMint;

    // 铸造费用
    uint256 public constant MINT_PRICE = 0.1 ether;

    event TreasuryWithdrawn(address indexed to, uint256 amount);

    // 修改者：只允许扫雷游戏合约调用
    modifier onlyMinesweeperGame() {
        require(msg.sender == minesweeperGame, "Only Minesweeper game can call");
        _;
    }

    constructor(
        string memory _name,
        string memory _symbol,
        address _minesweeperGame
    ) ERC721(_name, _symbol) Ownable(msg.sender) {
        minesweeperGame = _minesweeperGame;
    }

    // 修改为允许玩家自己铸造（需要付费）
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

    // 由游戏合约授予铸造资格
    function grantMintAccess(address player) external onlyMinesweeperGame {
        canMint[player] = true;
    }

    // 更新扫雷游戏合约地址
    function setMinesweeperGame(address _minesweeperGame) external onlyOwner {
        minesweeperGame = _minesweeperGame;
    }

    // 提取合约中的资金
    function withdrawTreasury() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance to withdraw");

        (bool success, ) = owner().call{value: balance}("");
        require(success, "Withdrawal failed");

        emit TreasuryWithdrawn(owner(), balance);
    }

    // 允许合约接收 ETH
    receive() external payable {}
} 