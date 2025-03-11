import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

/**
 * Deploys the Minesweeper contract
 *
 * @param hre HardhatRuntimeEnvironment object.
 */
const deployYourContract: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  /*
    On localhost, the deployer account is the one that comes with Hardhat, which is already funded.

    When deploying to live networks (e.g `yarn deploy --network sepolia`), the deployer account
    should have sufficient balance to pay for the gas fees for contract creation.

    You can generate a random account with `yarn generate` or `yarn account:import` to import your
    existing PK which will fill DEPLOYER_PRIVATE_KEY_ENCRYPTED in the .env file (then used on hardhat.config.ts)
    You can run the `yarn account` command to check your balance in every network.
  */
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  // 1. 部署扫雷游戏合约
  const minesweeper = await deploy("Minesweeper", {
    from: deployer,
    args: [],
    log: true,
    autoMine: true,
  });

  // 2. 部署 NFT 合约
  const nft = await deploy("MinesweeperNFT", {
    from: deployer,
    args: [
      "Minesweeper NFT",  // NFT 名称
      "MINE",             // NFT 符号
      minesweeper.address // 扫雷游戏合约地址
    ],
    log: true,
    autoMine: true,
  });

  // 3. 在扫雷游戏合约中设置 NFT 合约地址
  const minesweeperContract = await hre.ethers.getContractAt("Minesweeper", minesweeper.address);
  await minesweeperContract.setNFTContract(nft.address);

  console.log("Minesweeper deployed to:", minesweeper.address);
  console.log("MinesweeperNFT deployed to:", nft.address);
};

export default deployYourContract;

// Tags are useful if you have multiple deploy files and only want to run one of them.
// e.g. yarn deploy --tags YourContract
deployYourContract.tags = ["Minesweeper", "MinesweeperNFT"];
