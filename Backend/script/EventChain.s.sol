// SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;

import {Script, console} from "forge-std/Script.sol";
import {EventChain} from "../src/EventChain.sol";

contract EventChainScript is Script {
    EventChain public eventChain;

    function setUp() public {}

    function run() public {
        vm.startBroadcast();

        // Deploy EventChain contract
        eventChain = new EventChain();

        console.log("EventChain deployed to:", address(eventChain));
        console.log("Contract owner:", eventChain.owner());
        console.log("Event count:", eventChain.eventCount());
        console.log("Paused status:", eventChain.paused());

        vm.stopBroadcast();
    }
}
