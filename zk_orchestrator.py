import subprocess
import json
import os
import time
from web3 import Web3
from dotenv import load_dotenv

load_dotenv()

# ─── CONFIG ─────────────────────────────────────────
RPC_URL = "https://data-seed-prebsc-1-s1.binance.org:8545/"
VERIFIER_ADDRESS = os.getenv("verifier")

w3 = Web3(Web3.HTTPProvider(RPC_URL))

# ─── WAIT FOR INPUT.JSON ────────────────────────────
def wait_for_input_file():
    print("⏳ Waiting for input.json from server...")

    while not os.path.exists("input.json"):
        time.sleep(2)

    print("✅ input.json detected")

# ─── RUN ZK PROOF PIPELINE ──────────────────────────
def run_proof():
    print("⚙️ Generating witness...")
    subprocess.run("node pig_js/generate_witness.js pig_js/pig.wasm input.json witness.wtns", shell=True)

    print("⚙️ Generating proof...")
    subprocess.run("npx snarkjs groth16 prove pig_final.zkey witness.wtns proof.json public.json", shell=True)

    print("⚙️ Verifying locally...")
    subprocess.run("npx snarkjs groth16 verify verification_key.json public.json proof.json", shell=True)

# ─── CALL SMART CONTRACT ────────────────────────────
def call_contract():
    print("📡 Calling Verifier Contract...")

    with open("proof.json") as f:
        proof = json.load(f)

    with open("public.json") as f:
        public = json.load(f)

    contract = w3.eth.contract(
        address=VERIFIER_ADDRESS,
        abi=[{
            "inputs":[
                {"internalType":"uint256[2]","name":"_pA","type":"uint256[2]"},
                {"internalType":"uint256[2][2]","name":"_pB","type":"uint256[2][2]"},
                {"internalType":"uint256[2]","name":"_pC","type":"uint256[2]"},
                {"internalType":"uint256[1]","name":"_pubSignals","type":"uint256[1]"}
            ],
            "name":"verifyProof",
            "outputs":[{"internalType":"bool","name":"","type":"bool"}],
            "stateMutability":"view",
            "type":"function"
        }]
    )

    # Format inputs
    pA = [int(proof["pi_a"][0]), int(proof["pi_a"][1])]

    # 🔥 swap logic (VERY IMPORTANT)
    pB = [
        [int(proof["pi_b"][0][1]), int(proof["pi_b"][0][0])],
        [int(proof["pi_b"][1][1]), int(proof["pi_b"][1][0])]
    ]

    pC = [int(proof["pi_c"][0]), int(proof["pi_c"][1])]
    pub = [int(public[0])]

    result = contract.functions.verifyProof(pA, pB, pC, pub).call()

    print("✅ ON-CHAIN RESULT:", result)

# ─── MAIN ──────────────────────────────────────────
if __name__ == "__main__":
    print("🚀 FULL AUTO ZK PIPELINE STARTED\n")

    wait_for_input_file()
    run_proof()
    call_contract()

    print("\n🎉 PIPELINE COMPLETED")