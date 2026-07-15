pragma circom 2.1.6;

include "circomlib/circuits/poseidon.circom";

template PigCrossChain() {

    // PUBLIC INPUT
    signal input polygonRoot;

    // PRIVATE INPUTS (already hashed leaves from backend)
    signal input leafHashes[16];

    // Intermediate layers
    signal layer1[8];
    signal layer2[4];
    signal layer3[2];
    signal computedRoot;

    // Declare component arrays FIRST
    component pose1[8];
    component pose2[4];
    component pose3[2];
    component pose4;

    // Layer 1
    for (var i = 0; i < 8; i++) {
        pose1[i] = Poseidon(2);
        pose1[i].inputs[0] <== leafHashes[2*i];
        pose1[i].inputs[1] <== leafHashes[2*i+1];
        layer1[i] <== pose1[i].out;
    }

    // Layer 2
    for (var i = 0; i < 4; i++) {
        pose2[i] = Poseidon(2);
        pose2[i].inputs[0] <== layer1[2*i];
        pose2[i].inputs[1] <== layer1[2*i+1];
        layer2[i] <== pose2[i].out;
    }

    // Layer 3
    for (var i = 0; i < 2; i++) {
        pose3[i] = Poseidon(2);
        pose3[i].inputs[0] <== layer2[2*i];
        pose3[i].inputs[1] <== layer2[2*i+1];
        layer3[i] <== pose3[i].out;
    }

    // Final layer
    pose4 = Poseidon(2);
    pose4.inputs[0] <== layer3[0];
    pose4.inputs[1] <== layer3[1];
    computedRoot <== pose4.out;

    // Enforce equality
    computedRoot === polygonRoot;
}

component main { public [polygonRoot] } = PigCrossChain();