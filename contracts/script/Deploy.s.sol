// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {AgentBranchToken} from "../src/AgentBranchToken.sol";

/**
 * @title Deploy Script for AgentBranchToken
 * @notice Deploys ABT to Sepolia testnet
 * 
 * Usage:
 *   # Set environment variables
 *   export SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
 *   export PRIVATE_KEY=0x...
 *   export TREASURY_ADDRESS=0x...
 *   
 *   # Dry run
 *   forge script script/Deploy.s.sol --rpc-url $SEPOLIA_RPC_URL
 *   
 *   # Deploy
 *   forge script script/Deploy.s.sol --rpc-url $SEPOLIA_RPC_URL --broadcast
 *   
 *   # Verify on Etherscan
 *   forge script script/Deploy.s.sol --rpc-url $SEPOLIA_RPC_URL --broadcast --verify
 */
contract DeployScript is Script {
    function setUp() public {}

    function run() public {
        // Get configuration from environment
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address treasury = vm.envOr("TREASURY_ADDRESS", address(0xdead));

        console.log("Deploying AgentBranchToken...");
        console.log("Treasury:", treasury);

        vm.startBroadcast(deployerPrivateKey);

        AgentBranchToken token = new AgentBranchToken(treasury);

        vm.stopBroadcast();

        console.log("AgentBranchToken deployed to:", address(token));
        console.log("");
        console.log("Add this to your .env file:");
        console.log("ABT_CONTRACT_ADDRESS=%s", address(token));
        console.log("VITE_ABT_CONTRACT_ADDRESS=%s", address(token));
    }
}
