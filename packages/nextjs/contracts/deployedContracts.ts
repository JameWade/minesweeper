/**
 * This file is autogenerated by Scaffold-ETH.
 * You should not edit it manually or your changes might be overwritten.
 */
import { GenericContractsDeclaration } from "~~/utils/scaffold-eth/contract";

const deployedContracts = {
  31337: {
    Minesweeper: {
      address: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
      abi: [
        {
          inputs: [],
          stateMutability: "nonpayable",
          type: "constructor",
        },
        {
          inputs: [],
          name: "EnforcedPause",
          type: "error",
        },
        {
          inputs: [],
          name: "ExpectedPause",
          type: "error",
        },
        {
          inputs: [
            {
              internalType: "address",
              name: "owner",
              type: "address",
            },
          ],
          name: "OwnableInvalidOwner",
          type: "error",
        },
        {
          inputs: [
            {
              internalType: "address",
              name: "account",
              type: "address",
            },
          ],
          name: "OwnableUnauthorizedAccount",
          type: "error",
        },
        {
          inputs: [],
          name: "ReentrancyGuardReentrantCall",
          type: "error",
        },
        {
          anonymous: false,
          inputs: [
            {
              indexed: true,
              internalType: "address",
              name: "player",
              type: "address",
            },
            {
              indexed: false,
              internalType: "uint256",
              name: "moveCount",
              type: "uint256",
            },
            {
              indexed: false,
              internalType: "bytes32",
              name: "stateHash",
              type: "bytes32",
            },
          ],
          name: "BatchMoveProcessed",
          type: "event",
        },
        {
          anonymous: false,
          inputs: [
            {
              indexed: true,
              internalType: "address",
              name: "player",
              type: "address",
            },
            {
              indexed: false,
              internalType: "uint8",
              name: "x",
              type: "uint8",
            },
            {
              indexed: false,
              internalType: "uint8",
              name: "y",
              type: "uint8",
            },
            {
              indexed: false,
              internalType: "uint8",
              name: "adjacentMines",
              type: "uint8",
            },
            {
              indexed: false,
              internalType: "bytes32",
              name: "stateHash",
              type: "bytes32",
            },
            {
              indexed: false,
              internalType: "uint256",
              name: "moveCount",
              type: "uint256",
            },
          ],
          name: "CellRevealed",
          type: "event",
        },
        {
          anonymous: false,
          inputs: [
            {
              indexed: true,
              internalType: "address",
              name: "player",
              type: "address",
            },
            {
              indexed: false,
              internalType: "bool",
              name: "won",
              type: "bool",
            },
            {
              indexed: false,
              internalType: "uint256",
              name: "score",
              type: "uint256",
            },
            {
              indexed: false,
              internalType: "uint256",
              name: "timeSpent",
              type: "uint256",
            },
          ],
          name: "GameOver",
          type: "event",
        },
        {
          anonymous: false,
          inputs: [
            {
              indexed: true,
              internalType: "address",
              name: "player",
              type: "address",
            },
            {
              indexed: false,
              internalType: "bytes32",
              name: "boardHash",
              type: "bytes32",
            },
            {
              indexed: false,
              internalType: "uint8",
              name: "mineCount",
              type: "uint8",
            },
            {
              indexed: false,
              internalType: "uint256",
              name: "timestamp",
              type: "uint256",
            },
          ],
          name: "GameStarted",
          type: "event",
        },
        {
          anonymous: false,
          inputs: [
            {
              indexed: true,
              internalType: "address",
              name: "previousOwner",
              type: "address",
            },
            {
              indexed: true,
              internalType: "address",
              name: "newOwner",
              type: "address",
            },
          ],
          name: "OwnershipTransferred",
          type: "event",
        },
        {
          anonymous: false,
          inputs: [
            {
              indexed: false,
              internalType: "address",
              name: "account",
              type: "address",
            },
          ],
          name: "Paused",
          type: "event",
        },
        {
          anonymous: false,
          inputs: [
            {
              indexed: true,
              internalType: "address",
              name: "player",
              type: "address",
            },
            {
              indexed: false,
              internalType: "uint256",
              name: "refundAmount",
              type: "uint256",
            },
          ],
          name: "SessionClosed",
          type: "event",
        },
        {
          anonymous: false,
          inputs: [
            {
              indexed: true,
              internalType: "address",
              name: "player",
              type: "address",
            },
            {
              indexed: false,
              internalType: "uint256",
              name: "expiryTime",
              type: "uint256",
            },
            {
              indexed: false,
              internalType: "bytes32",
              name: "nonce",
              type: "bytes32",
            },
          ],
          name: "SessionCreated",
          type: "event",
        },
        {
          anonymous: false,
          inputs: [
            {
              indexed: false,
              internalType: "address",
              name: "account",
              type: "address",
            },
          ],
          name: "Unpaused",
          type: "event",
        },
        {
          inputs: [],
          name: "HEIGHT",
          outputs: [
            {
              internalType: "uint8",
              name: "",
              type: "uint8",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [],
          name: "MAX_GAS_PER_TX",
          outputs: [
            {
              internalType: "uint256",
              name: "",
              type: "uint256",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [],
          name: "SESSION_DURATION",
          outputs: [
            {
              internalType: "uint256",
              name: "",
              type: "uint256",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [],
          name: "WIDTH",
          outputs: [
            {
              internalType: "uint8",
              name: "",
              type: "uint8",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [],
          name: "closeSession",
          outputs: [],
          stateMutability: "nonpayable",
          type: "function",
        },
        {
          inputs: [],
          name: "createSession",
          outputs: [],
          stateMutability: "payable",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "address",
              name: "",
              type: "address",
            },
          ],
          name: "games",
          outputs: [
            {
              internalType: "bytes32",
              name: "boardHash",
              type: "bytes32",
            },
            {
              internalType: "uint256",
              name: "revealedMask",
              type: "uint256",
            },
            {
              internalType: "uint256",
              name: "startTime",
              type: "uint256",
            },
            {
              internalType: "bool",
              name: "isOver",
              type: "bool",
            },
            {
              internalType: "uint256",
              name: "score",
              type: "uint256",
            },
            {
              internalType: "bytes32",
              name: "stateHash",
              type: "bytes32",
            },
            {
              internalType: "uint256",
              name: "moveCount",
              type: "uint256",
            },
            {
              internalType: "uint8",
              name: "mineCount",
              type: "uint8",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [],
          name: "getPlayers",
          outputs: [
            {
              internalType: "address[]",
              name: "",
              type: "address[]",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "address[]",
              name: "_players",
              type: "address[]",
            },
          ],
          name: "getScores",
          outputs: [
            {
              internalType: "uint256[]",
              name: "",
              type: "uint256[]",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "address",
              name: "player",
              type: "address",
            },
          ],
          name: "getSession",
          outputs: [
            {
              internalType: "address",
              name: "sessionPlayer",
              type: "address",
            },
            {
              internalType: "uint256",
              name: "expiryTime",
              type: "uint256",
            },
            {
              internalType: "bytes32",
              name: "nonce",
              type: "bytes32",
            },
            {
              internalType: "bytes32",
              name: "lastHash",
              type: "bytes32",
            },
            {
              internalType: "uint256",
              name: "lastActionTime",
              type: "uint256",
            },
            {
              internalType: "uint256",
              name: "stake",
              type: "uint256",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "address",
              name: "",
              type: "address",
            },
          ],
          name: "highScores",
          outputs: [
            {
              internalType: "uint256",
              name: "",
              type: "uint256",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "address",
              name: "",
              type: "address",
            },
          ],
          name: "isPlayer",
          outputs: [
            {
              internalType: "bool",
              name: "",
              type: "bool",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [],
          name: "owner",
          outputs: [
            {
              internalType: "address",
              name: "",
              type: "address",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [],
          name: "pause",
          outputs: [],
          stateMutability: "nonpayable",
          type: "function",
        },
        {
          inputs: [],
          name: "paused",
          outputs: [
            {
              internalType: "bool",
              name: "",
              type: "bool",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "address",
              name: "",
              type: "address",
            },
          ],
          name: "playerGames",
          outputs: [
            {
              internalType: "uint256",
              name: "",
              type: "uint256",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "uint256",
              name: "",
              type: "uint256",
            },
          ],
          name: "players",
          outputs: [
            {
              internalType: "address",
              name: "",
              type: "address",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [
            {
              components: [
                {
                  internalType: "uint8",
                  name: "x",
                  type: "uint8",
                },
                {
                  internalType: "uint8",
                  name: "y",
                  type: "uint8",
                },
              ],
              internalType: "struct Minesweeper.Move[]",
              name: "moves",
              type: "tuple[]",
            },
            {
              internalType: "bytes",
              name: "signature",
              type: "bytes",
            },
          ],
          name: "processBatchMoves",
          outputs: [],
          stateMutability: "nonpayable",
          type: "function",
        },
        {
          inputs: [],
          name: "renounceOwnership",
          outputs: [],
          stateMutability: "nonpayable",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "address",
              name: "",
              type: "address",
            },
          ],
          name: "sessions",
          outputs: [
            {
              internalType: "address",
              name: "player",
              type: "address",
            },
            {
              internalType: "uint256",
              name: "expiryTime",
              type: "uint256",
            },
            {
              internalType: "bytes32",
              name: "nonce",
              type: "bytes32",
            },
            {
              internalType: "bytes32",
              name: "lastHash",
              type: "bytes32",
            },
            {
              internalType: "uint256",
              name: "lastActionTime",
              type: "uint256",
            },
            {
              internalType: "uint256",
              name: "stake",
              type: "uint256",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "bytes32",
              name: "salt",
              type: "bytes32",
            },
          ],
          name: "startNewGame",
          outputs: [],
          stateMutability: "nonpayable",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "address",
              name: "newOwner",
              type: "address",
            },
          ],
          name: "transferOwnership",
          outputs: [],
          stateMutability: "nonpayable",
          type: "function",
        },
        {
          inputs: [],
          name: "unpause",
          outputs: [],
          stateMutability: "nonpayable",
          type: "function",
        },
        {
          inputs: [],
          name: "withdraw",
          outputs: [],
          stateMutability: "nonpayable",
          type: "function",
        },
        {
          stateMutability: "payable",
          type: "receive",
        },
      ],
      inheritedFunctions: {
        paused: "@openzeppelin/contracts/utils/Pausable.sol",
        owner: "@openzeppelin/contracts/access/Ownable.sol",
        renounceOwnership: "@openzeppelin/contracts/access/Ownable.sol",
        transferOwnership: "@openzeppelin/contracts/access/Ownable.sol",
      },
    },
  },
} as const;

export default deployedContracts satisfies GenericContractsDeclaration;
