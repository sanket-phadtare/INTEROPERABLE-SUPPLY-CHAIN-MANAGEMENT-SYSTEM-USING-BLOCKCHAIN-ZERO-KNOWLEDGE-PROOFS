// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IVerifier {
    function verifyProof(
        uint[2] memory a,
        uint[2][2] memory b,
        uint[2] memory c,
        uint[3] memory input
    ) external view returns (bool);
}

contract PigZKBridge {

    IVerifier public verifier;

    struct CrossChainPig {
        uint256 pigId;
        bytes32 merkleRoot;
        string ipfsCid;
        bool verified;
    }

    mapping(uint256 => CrossChainPig) public bridgedPigs;

    event PigBridged(uint256 pigId, bytes32 root, string cid);

    constructor(address _verifier) {
        verifier = IVerifier(_verifier);
    }

    function verifyAndStore(
        uint256 pigId,
        bytes32 merkleRoot,
        string memory ipfsCid,
        uint[2] memory a,
        uint[2][2] memory b,
        uint[2] memory c,
        uint[3] memory input
    ) public {

        require(
            verifier.verifyProof(a, b, c, input),
            "Invalid ZK Proof"
        );

        bridgedPigs[pigId] = CrossChainPig(
            pigId,
            merkleRoot,
            ipfsCid,
            true
        );

        emit PigBridged(pigId, merkleRoot, ipfsCid);
    }
}