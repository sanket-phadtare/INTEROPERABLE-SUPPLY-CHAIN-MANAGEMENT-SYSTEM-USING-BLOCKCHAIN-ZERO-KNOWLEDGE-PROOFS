import express from 'express';
import dotenv from 'dotenv';
import crypto from 'crypto';
import pg from 'pg';
import Web3 from 'web3';
import axios from 'axios';
import { buildPoseidon } from 'circomlibjs';
import winston from 'winston';
import Redis from 'ioredis';
import fs from 'fs';

const { Pool } = pg;
dotenv.config();
const app = express();
app.use(express.json());
const redisClient = new Redis();

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'server.log' })
    ]
});

const pinata_api = process.env.PINATA_API_KEY;
const pinata_secret = process.env.PINATA_API_SECRET;

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT
});

const web3 = new Web3('https://rpc-amoy.polygon.technology/');
const contractABI = [
    {
        "inputs": [],
        "stateMutability": "nonpayable",
        "type": "constructor"
    },
    {
        "anonymous": false,
        "inputs": [
            { "indexed": false, "internalType": "uint256", "name": "pig_id", "type": "uint256" },
            { "indexed": false, "internalType": "bytes32", "name": "pig_hash", "type": "bytes32" },
            { "indexed": false, "internalType": "string", "name": "ipfs_cid", "type": "string" }
        ],
        "name": "PigRegistered",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            { "indexed": false, "internalType": "uint256", "name": "pig_id", "type": "uint256" },
            { "indexed": false, "internalType": "bytes32", "name": "qr_hash", "type": "bytes32" },
            { "indexed": false, "internalType": "string", "name": "ipfs_cid", "type": "string" }
        ],
        "name": "QRCodeGenerated",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            { "indexed": false, "internalType": "uint256", "name": "pig_id", "type": "uint256" },
            { "indexed": false, "internalType": "bytes32", "name": "sales_hash", "type": "bytes32" },
            { "indexed": false, "internalType": "string", "name": "ipfs_cid", "type": "string" }
        ],
        "name": "SaleRecorded",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            { "indexed": false, "internalType": "uint256", "name": "pig_id", "type": "uint256" },
            { "indexed": false, "internalType": "bytes32", "name": "vaccine_hash", "type": "bytes32" },
            { "indexed": false, "internalType": "string", "name": "ipfs_cid", "type": "string" }
        ],
        "name": "VaccinationAdded",
        "type": "event"
    },
    {
        "inputs": [
            { "internalType": "uint256[]", "name": "pig_id", "type": "uint256[]" },
            { "internalType": "bytes32[]", "name": "vaccine_hash", "type": "bytes32[]" },
            { "internalType": "string[]", "name": "ipfs_cid", "type": "string[]" }
        ],
        "name": "addVaccination",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "uint256", "name": "pig_id", "type": "uint256" },
            { "internalType": "bytes32", "name": "qr_hash", "type": "bytes32" },
            { "internalType": "string", "name": "ipfs_cid", "type": "string" }
        ],
        "name": "generateQRCode",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "uint256", "name": "pig_id", "type": "uint256" }],
        "name": "getPigData",
        "outputs": [
            { "internalType": "uint256", "name": "", "type": "uint256" },
            { "internalType": "bytes32", "name": "", "type": "bytes32" },
            { "internalType": "string", "name": "", "type": "string" }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "uint256", "name": "pig_id", "type": "uint256" }],
        "name": "getQRData",
        "outputs": [
            { "internalType": "uint256", "name": "", "type": "uint256" },
            { "internalType": "bytes32", "name": "", "type": "bytes32" },
            { "internalType": "string", "name": "", "type": "string" }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "uint256", "name": "pig_id", "type": "uint256" }],
        "name": "getSalesData",
        "outputs": [
            { "internalType": "uint256", "name": "", "type": "uint256" },
            { "internalType": "bytes32", "name": "", "type": "bytes32" },
            { "internalType": "string", "name": "", "type": "string" }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "uint256", "name": "pig_id", "type": "uint256" }],
        "name": "getVaccinationData",
        "outputs": [
            { "internalType": "uint256", "name": "", "type": "uint256" },
            { "internalType": "bytes32", "name": "", "type": "bytes32" },
            { "internalType": "string", "name": "", "type": "string" }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "owner",
        "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "name": "pigData",
        "outputs": [
            { "internalType": "uint256", "name": "pig_id", "type": "uint256" },
            { "internalType": "bytes32", "name": "pig_hash", "type": "bytes32" },
            { "internalType": "string", "name": "ipfs_cid", "type": "string" }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "name": "qrData",
        "outputs": [
            { "internalType": "uint256", "name": "pig_id", "type": "uint256" },
            { "internalType": "bytes32", "name": "qr_hash", "type": "bytes32" },
            { "internalType": "string", "name": "ipfs_cid", "type": "string" }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "uint256[]", "name": "pig_id", "type": "uint256[]" },
            { "internalType": "bytes32[]", "name": "sales_hash", "type": "bytes32[]" },
            { "internalType": "string[]", "name": "ipfs_cid", "type": "string[]" }
        ],
        "name": "recordSale",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "uint256[]", "name": "pig_ids", "type": "uint256[]" },
            { "internalType": "bytes32[]", "name": "pig_hashes", "type": "bytes32[]" },
            { "internalType": "string[]", "name": "ipfs_cids", "type": "string[]" }
        ],
        "name": "registerPig",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "name": "salesData",
        "outputs": [
            { "internalType": "uint256", "name": "pig_id", "type": "uint256" },
            { "internalType": "bytes32", "name": "sales_hash", "type": "bytes32" },
            { "internalType": "string", "name": "ipfs_cid", "type": "string" }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "name": "vaccinationData",
        "outputs": [
            { "internalType": "uint256", "name": "pig_id", "type": "uint256" },
            { "internalType": "bytes32", "name": "vaccine_hash", "type": "bytes32" },
            { "internalType": "string", "name": "ipfs_cid", "type": "string" }
        ],
        "stateMutability": "view",
        "type": "function"
    }
];

const contractAddress = process.env.CONTRACT_ADDRESS;
const contract = new web3.eth.Contract(contractABI, contractAddress);
const privateKey = process.env.PRIVATE_KEY;
const walletAddress = process.env.WALLET_ADDRESS;

// ─── Poseidon State ───────────────────────────────────────────────────────────
let poseidon = null;
let F = null;

async function initPoseidon() {
    poseidon = await buildPoseidon();
    F = poseidon.F;
    logger.info('Poseidon hash function initialized successfully');
}

// ─── Field Conversion Helpers ─────────────────────────────────────────────────

// BN254 scalar field modulus
const FIELD_MODULUS = BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617');

function stringToField(str) {
    if (str === null || str === undefined) return BigInt(0);
    const normalized = String(str).trim();
    // Encode string as UTF-8 bytes then interpret as big-endian BigInt, mod field
    const bytes = Buffer.from(normalized, 'utf8');
    let bigintVal = BigInt(0);
    for (const byte of bytes) {
        bigintVal = (bigintVal << BigInt(8)) | BigInt(byte);
    }
    return bigintVal % FIELD_MODULUS;
}

function numberToField(val) {
    if (val === null || val === undefined) return BigInt(0);
    const n = BigInt(Math.round(Number(val)));
    return ((n % FIELD_MODULUS) + FIELD_MODULUS) % FIELD_MODULUS;
}

function dateToField(val) {
    if (val === null || val === undefined) return BigInt(0);
    // Normalize: strip time component if present, keep as string
    return stringToField(String(val).trim());
}

function saltToField(saltHex) {
    // Salts are stored as 32-char hex strings (16 bytes)
    const n = BigInt('0x' + saltHex);
    return n % FIELD_MODULUS;
}

/**
 * Convert any value to a field element deterministically.
 * Numbers stay numeric; everything else goes through stringToField.
 */
function valueToField(val) {
    if (val === null || val === undefined) return BigInt(0);
    // If it looks like a pure integer number, use numberToField for compactness
    const asStr = String(val).trim();
    if (/^\d+$/.test(asStr)) {
        return numberToField(asStr);
    }
    // Dates, strings, decimals, alphanumeric all go through stringToField
    return stringToField(asStr);
}

// ─── Poseidon Hash With Salt ──────────────────────────────────────────────────

function hashWithSalt(value) {
    if (!poseidon || !F) throw new Error('Poseidon not initialized');

    const saltHex = crypto.randomBytes(16).toString('hex');
    const saltField = saltToField(saltHex);
    const valueField = valueToField(value);

    const hashResult = poseidon([saltField, valueField]);
    const hashBigInt = F.toObject(hashResult);
    const hashStr = hashBigInt.toString();

    return { salt: saltHex, hash: hashStr };
}

function hashWithSaltDeterministic(saltHex, value) {
    if (!poseidon || !F) throw new Error('Poseidon not initialized');

    const saltField = saltToField(saltHex);
    const valueField = valueToField(value);

    const hashResult = poseidon([saltField, valueField]);
    const hashBigInt = F.toObject(hashResult);
    return hashBigInt.toString();
}

// ─── Fixed-Depth Poseidon Merkle Tree ────────────────────────────────────────
// Depth is determined by next power of 2 >= leaf count, minimum 16 leaves.
// Leaves are padded with BigInt(0). Pairs combined left-to-right (no sorting).

function buildPoseidonMerkleTree(leafHashStrings) {
    if (!poseidon || !F) throw new Error('Poseidon not initialized');

    // Determine tree size: pad to next power of 2, minimum 16
    const minSize = 16;
    let size = minSize;
    while (size < leafHashStrings.length) size *= 2;

    // Convert leaf hash strings to BigInts and pad
    let layer = [];
    for (let i = 0; i < size; i++) {
        if (i < leafHashStrings.length) {
            layer.push(BigInt(leafHashStrings[i]));
        } else {
            layer.push(BigInt(0));
        }
    }

    // Iteratively combine pairs until one root remains
    while (layer.length > 1) {
        const nextLayer = [];
        for (let i = 0; i < layer.length; i += 2) {
            const left = layer[i];
            const right = layer[i + 1];
            const combined = poseidon([left, right]);
            nextLayer.push(F.toObject(combined));
        }
        layer = nextLayer;
    }

    const rootBigInt = layer[0];
    // Convert to 32-byte hex with 0x prefix
    const rootHex = '0x' + rootBigInt.toString(16).padStart(64, '0');
    return rootHex;
}

// ─── IPFS ─────────────────────────────────────────────────────────────────────

async function uploadToIPFS(data, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await axios.post('https://api.pinata.cloud/pinning/pinJSONToIPFS', data, {
                headers: {
                    pinata_api_key: pinata_api,
                    pinata_secret_api_key: pinata_secret,
                },
            });
            return response.data.IpfsHash;
        } catch (error) {
            logger.error(`Attempt ${i + 1} failed to upload to IPFS: ${error.message}`);
        }
    }
    throw new Error('Failed to upload data to IPFS');
}

// ─── Gas / Price ──────────────────────────────────────────────────────────────

async function getMaticPriceInINR() {
    try {
        const response = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=matic-network&vs_currencies=inr');
        return response.data['matic-network'].inr;
    } catch (error) {
        logger.error(`Error fetching MATIC price: ${error.message}`);
        throw error;
    }
}

// ─── Blockchain Transaction ───────────────────────────────────────────────────

async function sendBlockchainTransaction(method, params) {
    try {
        const txData = method(...params).encodeABI();
        const gasEstimate = await method(...params).estimateGas({ from: walletAddress });
        const gasPriceWei = await web3.eth.getGasPrice();
        const gasPriceBigInt = BigInt(gasPriceWei);
        const nonce = await web3.eth.getTransactionCount(walletAddress);

        const txObject = {
            to: contractAddress,
            data: txData,
            gas: Math.floor(Number(gasEstimate) * 1.2),
            gasPrice: gasPriceBigInt.toString(),
            nonce: Number(nonce),
        };

        const signedTx = await web3.eth.accounts.signTransaction(txObject, privateKey);
        const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

        const gasCostWei = BigInt(txObject.gas) * BigInt(txObject.gasPrice);
        const gasCostMatic = web3.utils.fromWei(gasCostWei.toString(), 'ether');
        const maticPriceInINR = await getMaticPriceInINR();
        const totalCostINR = parseFloat(gasCostMatic) * maticPriceInINR;
        console.log(`Total cost in INR: ₹${totalCostINR.toFixed(2)}`);

        return receipt;
    } catch (error) {
        logger.error(`Blockchain transaction failed: ${error.message}`);
        throw error;
    }
}

// ─── Routes ───────────────────────────────────────────────────────────────────

app.post('/api/pigs', async function (req, res) {
    const client = await pool.connect();
    try {
        const pigsData = req.body;
        if (!Array.isArray(pigsData) || pigsData.length === 0) {
            return res.status(400).send('Invalid input: Expected an array of pig details');
        }

        const pigIds = [];
        const pigHashes = [];
        const ipfsCids = [];

        logger.info('Processing batch of pigs');
        await client.query('BEGIN');

        for (const pig of pigsData) {
            const { pigId, birthDate, soldAt, breed, geneticLineage, birthWeight, earTag, sex, status, farmId } = pig;

            const values = [pigId, birthDate, soldAt, breed, geneticLineage, birthWeight, earTag, sex, status, farmId];
            const saltedHashes = values.map(hashWithSalt);
            const salts = saltedHashes.map(h => h.salt);
            const leafHashes = saltedHashes.map(h => h.hash);

            const merkleroot = buildPoseidonMerkleTree(leafHashes);
            console.log("Leaf Hashes Used:", leafHashes);
console.log("Merkle Root:", merkleroot);
// Convert hex root → decimal
const rootDecimal = BigInt(merkleroot).toString();

// Pad leaves to 16
const paddedLeaves = [...leafHashes];
while (paddedLeaves.length < 16) {
    paddedLeaves.push("0");
}

// Create input.json automatically
const zkInput = {
    polygonRoot: rootDecimal,
    leafHashes: paddedLeaves
};

fs.writeFileSync("input.json", JSON.stringify(zkInput, null, 2));

console.log("✅ input.json generated automatically");

            const qrCodeBase64 = Buffer.from(pigId.toString()).toString('base64');

            const ipfsData = { pigId, birthDate, soldAt, breed, geneticLineage, birthWeight, earTag, sex, status, farmId };
            const ipfs_cid = await uploadToIPFS(ipfsData);
            logger.info(`Data for pig ${pigId} added to IPFS`);

            pigIds.push(pigId);
            pigHashes.push(merkleroot);
            ipfsCids.push(ipfs_cid);

            const insertQuery = `INSERT INTO pig_profiles (pig_id, birth_date, sold_at, breed, genetic_lineage, birth_weight, ear_tag, sex, status, farm_id, salt1, salt2, salt3, salt4, salt5, salt6, salt7, salt8, salt9, salt10) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)`;
            const insertValues = [pigId, birthDate, soldAt, breed, geneticLineage, birthWeight, earTag, sex, status, farmId, ...salts];

            logger.info(`Inserting Data for pig ${pigId} into DB`);
            await client.query(insertQuery, insertValues);

            const insertQr = `INSERT INTO qr_codes (pig_id, qr_code_data) VALUES ($1, $2)`;
            await client.query(insertQr, [pigId, qrCodeBase64]);
        }

        const receipt = await sendBlockchainTransaction(contract.methods.registerPig, [pigIds, pigHashes, ipfsCids]);
        logger.info(`Batch transaction successful with hash: ${receipt.transactionHash}`);

        await client.query('COMMIT');
        res.send('Batch data added successfully');
        logger.info(`Batch processed: ${pigIds.length} pigs added`);
        
    } catch (error) {
        await client.query('ROLLBACK');
        logger.error(`Error: ${error.message}`);
        res.status(500).send('Error adding batch data');
    } finally {
        client.release();
    }
});

export { app, pool };

app.post('/api/vaccination', async function (req, res) {
    try {
        const vaccinationsData = req.body;
        if (!Array.isArray(vaccinationsData) || vaccinationsData.length === 0) {
            return res.status(400).send('Invalid input: Expected an array of vaccination details');
        }

        const pigIds = [];
        const vaccinationHashes = [];
        const ipfsCids = [];
        const dbInsertions = [];

        logger.info('Processing batch of vaccinations');

        for (const vaccination of vaccinationsData) {
            const { vaccinationId, pigId, vaccineName, batchNumber, administeredBy, adminDate, nextDueDate } = vaccination;

            const values = [vaccinationId, pigId, vaccineName, batchNumber, administeredBy, adminDate, nextDueDate];
            const saltedHashes = values.map(hashWithSalt);
            const salts = saltedHashes.map(h => h.salt);
            const leafHashes = saltedHashes.map(h => h.hash);

            const merkleroot = buildPoseidonMerkleTree(leafHashes);

            const ipfsData = { vaccinationId, pigId, vaccineName, batchNumber, administeredBy, adminDate, nextDueDate };
            const ipfs_cid = await uploadToIPFS(ipfsData);
            logger.info(`Data added to IPFS`);

            pigIds.push(pigId);
            vaccinationHashes.push(merkleroot);
            ipfsCids.push(ipfs_cid);

            const insertQuery = `INSERT INTO vaccination_logs (vaccination_id, pig_id, vaccine_name, batch_number, administered_by, admin_date, next_due_date, vsalt1, vsalt2, vsalt3, vsalt4, vsalt5, vsalt6, vsalt7) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`;
            const insertValues = [vaccinationId, pigId, vaccineName, batchNumber, administeredBy, adminDate, nextDueDate, ...salts];

            logger.info(`Inserting vaccination data into DB`);
            dbInsertions.push(pool.query(insertQuery, insertValues));
        }

        const receipt = await sendBlockchainTransaction(contract.methods.addVaccination, [pigIds, vaccinationHashes, ipfsCids]);
        logger.info(`Batch transaction successful with hash: ${receipt.transactionHash}`);

        await Promise.all(dbInsertions);

        res.send('Batch vaccination data added successfully');
        logger.info(`Batch processed: ${vaccinationsData.length} vaccinations added`);
    } catch (error) {
        logger.error(`Error: ${error.message}`);
        res.status(500).send('Error adding batch vaccination data');
    }
});

app.post('/api/sales', async function (req, res) {
    try {
        const salesData = req.body;
        if (!Array.isArray(salesData) || salesData.length === 0) {
            return res.status(400).send('Invalid input: Expected an array of vaccination details');
        }

        const pigIds = [];
        const salesHashes = [];
        const ipfsCids = [];
        const dbInsertions = [];

        logger.info('Processing batch of Sales Data');

        for (const sales of salesData) {
            const { saleId, pigId, saleDate, finalWeight, buyerName, buyerContact, price } = sales;

            const values = [saleId, pigId, saleDate, finalWeight, buyerName, buyerContact, price];
            const saltedHashes = values.map(hashWithSalt);
            const salts = saltedHashes.map(h => h.salt);
            const leafHashes = saltedHashes.map(h => h.hash);

            const merkleroot = buildPoseidonMerkleTree(leafHashes);

            const ipfsData = { saleId, pigId, saleDate, finalWeight, buyerName, buyerContact, price };
            const ipfs_cid = await uploadToIPFS(ipfsData);
            logger.info(`Data added to IPFS`);

            pigIds.push(pigId);
            salesHashes.push(merkleroot);
            ipfsCids.push(ipfs_cid);

            const insertQuery = `INSERT INTO sales (sale_id, pig_id, sale_date, final_weight, buyer_name, buyer_contact, price, ssalt1, ssalt2, ssalt3, ssalt4, ssalt5, ssalt6, ssalt7) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`;
            const insertValues = [saleId, pigId, saleDate, finalWeight, buyerName, buyerContact, price, ...salts];

            logger.info(`Inserting sales data into DB`);
            dbInsertions.push(pool.query(insertQuery, insertValues));
        }

        const receipt = await sendBlockchainTransaction(contract.methods.recordSale, [pigIds, salesHashes, ipfsCids]);
        logger.info(`Batch transaction successful with hash: ${receipt.transactionHash}`);

        await Promise.all(dbInsertions);

        res.send('Batch sales data added successfully');
        logger.info(`Batch processed: ${salesData.length} Sales Record added`);
    } catch (error) {
        logger.error(`Error: ${error.message}`);
        res.status(500).send('Error adding batch sales data');
    }
});

// ─── Verify: Pig ──────────────────────────────────────────────────────────────

app.post('/api/verify/pig', async function (req, res) {
    const { p_qr_code } = req.body;

    const startTime = Date.now(); // START TIMER

    try {
        logger.info('Please wait while we verify Pig details...');

        const decodePigId = Buffer.from(p_qr_code, 'base64').toString();
        const cacheKey = `pig:${decodePigId}`;

        // 🔹 CACHE CHECK
        const cachedData = await redisClient.get(cacheKey);

        if (cachedData) {
            const endTime = Date.now();
            const timeTaken = endTime - startTime;

            logger.info(`Traditional Verification Time (Cache): ${timeTaken} ms`);

            const verifyResult = JSON.parse(cachedData);
            logger.info('Pig Details Verified (Hit Cache)');
            return res.json(verifyResult);
        }

        // 🔹 FETCH FROM BLOCKCHAIN
        const data = await contract.methods.getPigData(decodePigId).call();

        if (!data || data.length === 0) {
            return res.status(404).json({ message: 'Product not found' });
        }

        const pig_block_merkle_root = data[1];
        const pig_p_ipfs_hash = data[2];

        // 🔹 FETCH FROM DATABASE
        const query = `SELECT * FROM pig_profiles WHERE pig_id = $1`;
        const result = await pool.query(query, [decodePigId]);

        if (result.rows.length === 0) {
            logger.warn('Product not found in database');
            return res.status(404).json({ message: 'Product not found in database' });
        }

        const {
            salt1, salt2, salt3, salt4, salt5,
            salt6, salt7, salt8, salt9, salt10
        } = result.rows[0];

        // 🔹 FETCH FROM IPFS
        const url = `https://gateway.pinata.cloud/ipfs/${pig_p_ipfs_hash}`;
        const response = await axios.get(url);
        const jsonData = response.data;

        // 🔹 PREPARE DATA
        const rawValues = [
            decodePigId,
            jsonData.birthDate,
            jsonData.soldAt,
            jsonData.breed,
            jsonData.geneticLineage,
            jsonData.birthWeight,
            jsonData.earTag,
            jsonData.sex,
            jsonData.status,
            jsonData.farmId
        ];

        const salts = [
            salt1, salt2, salt3, salt4, salt5,
            salt6, salt7, salt8, salt9, salt10
        ];

        // 🔹 HASHING + MERKLE TREE
        const leafHashes = rawValues.map((value, index) =>
            hashWithSaltDeterministic(salts[index], value)
        );

        const pigVerifyMerkleRoot = buildPoseidonMerkleTree(leafHashes);

        logger.info(
            `Blockchain Merkle Root: ${pig_block_merkle_root}, Calculated Merkle Root: ${pigVerifyMerkleRoot}`
        );

        const isPigVerificationValid =
            pig_block_merkle_root.toLowerCase() === pigVerifyMerkleRoot.toLowerCase();

        // 🔹 STOP TIMER (IMPORTANT: BEFORE RETURN)
        const endTime = Date.now();
        const timeTaken = endTime - startTime;

        logger.info(`Traditional Verification Time: ${timeTaken} ms`);

        // 🔹 RESPONSE
        if (isPigVerificationValid) {
            const verifyResult = {
                message: 'Pig Data is Authentic',
                status: 'Verified'
            };

            logger.info('Pig Verified: Authentic');

            await redisClient.set(cacheKey, JSON.stringify(verifyResult), 'EX', 3600);

            return res.json(verifyResult);

        } else {
            const verificationResult = {
                message: 'Pig data is tampered',
                status: 'Tampered'
            };

            logger.warn('Pig Verification Failed: Data Tampered');

            await redisClient.set(cacheKey, JSON.stringify(verificationResult), 'EX', 600);

            return res.json(verificationResult);
        }

    } catch (error) {
        const endTime = Date.now();
        const timeTaken = endTime - startTime;

        logger.error(`Error: ${error.message}`);
        logger.info(`Traditional Verification Time (Error Case): ${timeTaken} ms`);

        return res.status(500).send('Error verifying data');
    }
});

// ─── Verify: Vaccination ──────────────────────────────────────────────────────

app.post('/api/verify/vaccination', async function (req, res) {
    const { p_qr_code } = req.body;
    try {
        logger.info('Please wait while we verify Vaccination details...');
        const decodePigId = Buffer.from(p_qr_code, 'base64').toString();
        const cacheKey = `vaccine:${decodePigId}`;
        const cachedData = await redisClient.get(cacheKey);

        if (cachedData) {
            const verifyResult = JSON.parse(cachedData);
            logger.info('Vaccination Details Verified (Hit Cache):', verifyResult);
            return res.json(verifyResult);
        }

        const data = await contract.methods.getVaccinationData(decodePigId).call();
        if (!data || data.length === 0) {
            return res.status(404).json({ message: 'Details not found' });
        }

        const vaccine_block_merkle_root = data[1];
        const vaccine_ipfs_hash = data[2];

        const query = `SELECT * FROM vaccination_logs WHERE pig_id = $1`;
        const result = await pool.query(query, [decodePigId]);

        if (result.rows.length === 0) {
            logger.warn('Product not found in database');
            return res.status(404).json({ message: 'Product not found in database' });
        }

        const { vsalt1, vsalt2, vsalt3, vsalt4, vsalt5, vsalt6, vsalt7 } = result.rows[0];
        const url = `https://gateway.pinata.cloud/ipfs/${vaccine_ipfs_hash}`;
        const response = await axios.get(url);
        const jsonData = response.data;

        const rawValues = [jsonData.vaccinationId, decodePigId, jsonData.vaccineName, jsonData.batchNumber, jsonData.administeredBy, jsonData.adminDate, jsonData.nextDueDate];
        const salts = [vsalt1, vsalt2, vsalt3, vsalt4, vsalt5, vsalt6, vsalt7];

        const leafHashes = rawValues.map((value, index) => hashWithSaltDeterministic(salts[index], value));
        const vaccineVerifyMerkleRoot = buildPoseidonMerkleTree(leafHashes);

        logger.info(`Blockchain Merkle Root: ${vaccine_block_merkle_root}, Calculated Merkle Root: ${vaccineVerifyMerkleRoot}`);
        const isvaccineVerificationValid = vaccine_block_merkle_root.toLowerCase() === vaccineVerifyMerkleRoot.toLowerCase();

        if (isvaccineVerificationValid) {
            const verifyResult = { message: 'Vaccination Data is Authentic', status: 'Verified' };
            logger.info('Vaccination Details Verified: Authentic');
            await redisClient.set(cacheKey, JSON.stringify(verifyResult), 'EX', 3600);
            return res.json(verifyResult);
        } else {
            const verificationResult = { message: 'Vaccination data is tampered', status: 'Tampered' };
            logger.warn('Vaccination Verification Failed: Data Tampered');
            await redisClient.set(cacheKey, JSON.stringify(verificationResult), 'EX', 600);
            return res.json(verificationResult);
        }
    } catch (error) {
        logger.error(`Error: ${error.message}`);
        res.status(500).send('Error verifying data');
    }
});

// ─── Verify: Sales ────────────────────────────────────────────────────────────

app.post('/api/verify/sales', async function (req, res) {
    const { p_qr_code } = req.body;
    try {
        logger.info('Please wait while we verify Sales Record...');
        const decodePigId = Buffer.from(p_qr_code, 'base64').toString();
        const cacheKey = `sales:${decodePigId}`;
        const cachedData = await redisClient.get(cacheKey);

        if (cachedData) {
            const verifyResult = JSON.parse(cachedData);
            logger.info('Sales Record Verified (Hit Cache):', verifyResult);
            return res.json(verifyResult);
        }

        const data = await contract.methods.getSalesData(decodePigId).call();
        if (!data || data.length === 0) {
            return res.status(404).json({ message: 'Details not found' });
        }

        const sales_block_merkle_root = data[1];
        const sales_ipfs_hash = data[2];

        const query = `SELECT * FROM sales WHERE pig_id = $1`;
        const result = await pool.query(query, [decodePigId]);

        if (result.rows.length === 0) {
            logger.warn('Product not found in database');
            return res.status(404).json({ message: 'Product not found in database' });
        }

        const { ssalt1, ssalt2, ssalt3, ssalt4, ssalt5, ssalt6, ssalt7 } = result.rows[0];
        const url = `https://gateway.pinata.cloud/ipfs/${sales_ipfs_hash}`;
        const response = await axios.get(url);
        const jsonData = response.data;

        const rawValues = [jsonData.saleId, decodePigId, jsonData.saleDate, jsonData.finalWeight, jsonData.buyerName, jsonData.buyerContact, jsonData.price];
        const salts = [ssalt1, ssalt2, ssalt3, ssalt4, ssalt5, ssalt6, ssalt7];

        const leafHashes = rawValues.map((value, index) => hashWithSaltDeterministic(salts[index], value));
        const salesVerifyMerkleRoot = buildPoseidonMerkleTree(leafHashes);

        logger.info(`Blockchain Merkle Root: ${sales_block_merkle_root}, Calculated Merkle Root: ${salesVerifyMerkleRoot}`);
        const issalesVerificationValid = sales_block_merkle_root.toLowerCase() === salesVerifyMerkleRoot.toLowerCase();

        if (issalesVerificationValid) {
            const verifyResult = { message: 'Sales Record is Authentic', status: 'Verified' };
            logger.info('Sales Record Verified: Authentic');
            await redisClient.set(cacheKey, JSON.stringify(verifyResult), 'EX', 3600);
            return res.json(verifyResult);
        } else {
            const verificationResult = { message: 'Sales Record is tampered', status: 'Tampered' };
            logger.warn('Sales Record Verification Failed: Data Tampered');
            await redisClient.set(cacheKey, JSON.stringify(verificationResult), 'EX', 600);
            return res.json(verificationResult);
        }
    } catch (error) {
        logger.error(`Error: ${error.message}`);
        res.status(500).send('Error verifying data');
    }
});

// ─── Verify: Full Product ─────────────────────────────────────────────────────

app.post('/api/verify', async function (req, res) {
    const { qrCode } = req.body;
    try {
        logger.info('Please wait while we verify your product...');
        const decodedPigId = Buffer.from(qrCode, 'base64').toString();
        const cacheKey = `product:${decodedPigId}`;
        const cachedData = await redisClient.get(cacheKey);

        if (cachedData) {
            const verificationResult = JSON.parse(cachedData);
            logger.info('Product Verified (Hit Cache):', verificationResult);
            return res.json(verificationResult);
        }

        // ── Pig verification ──
        const pigData = await contract.methods.getPigData(decodedPigId).call();
        if (!pigData || pigData.length === 0) {
            return res.status(404).json({ message: 'Product not found' });
        }

        const pig_block_merkle = pigData[1];
        const pig_p_cid = pigData[2];

        const pigQuery = `SELECT * FROM pig_profiles WHERE pig_id = $1`;
        const pigResult = await pool.query(pigQuery, [decodedPigId]);

        if (pigResult.rows.length === 0) {
            logger.warn('Product not found in database');
            return res.status(404).json({ message: 'Product not found in database' });
        }

        const { salt1, salt2, salt3, salt4, salt5, salt6, salt7, salt8, salt9, salt10 } = pigResult.rows[0];
        const pigUrl = `https://gateway.pinata.cloud/ipfs/${pig_p_cid}`;
        const pigResponse = await axios.get(pigUrl);
        const pigJson = pigResponse.data;

        const pigRawValues = [decodedPigId, pigJson.birthDate, pigJson.soldAt, pigJson.breed, pigJson.geneticLineage, pigJson.birthWeight, pigJson.earTag, pigJson.sex, pigJson.status, pigJson.farmId];
        const pigSalts = [salt1, salt2, salt3, salt4, salt5, salt6, salt7, salt8, salt9, salt10];
        const pigLeafHashes = pigRawValues.map((value, index) => hashWithSaltDeterministic(pigSalts[index], value));
        const verifyPigMerkleRoot = buildPoseidonMerkleTree(pigLeafHashes);

        logger.info(`Blockchain Merkle Root: ${pig_block_merkle}, Calculated Merkle Root: ${verifyPigMerkleRoot}`);
        const isPigValid = pig_block_merkle.toLowerCase() === verifyPigMerkleRoot.toLowerCase();

        // ── Vaccination verification ──
        const vaccineData = await contract.methods.getVaccinationData(decodedPigId).call();
        const vaccine_block_merkle = vaccineData[1];
        const vaccine_cid = vaccineData[2];

        const vaccineQuery = `SELECT * FROM vaccination_logs WHERE pig_id = $1`;
        const vaccineResult = await pool.query(vaccineQuery, [decodedPigId]);

        if (vaccineResult.rows.length === 0) {
            logger.warn('Product not found in database');
            return res.status(404).json({ message: 'Product not found in database' });
        }

        const { vsalt1, vsalt2, vsalt3, vsalt4, vsalt5, vsalt6, vsalt7 } = vaccineResult.rows[0];
        const vUrl = `https://gateway.pinata.cloud/ipfs/${vaccine_cid}`;
        const vResponse = await axios.get(vUrl);
        const vJson = vResponse.data;

        const vRawValues = [vJson.vaccinationId, vJson.pigId, vJson.vaccineName, vJson.batchNumber, vJson.administeredBy, vJson.adminDate, vJson.nextDueDate];
        const vSalts = [vsalt1, vsalt2, vsalt3, vsalt4, vsalt5, vsalt6, vsalt7];
        const vLeafHashes = vRawValues.map((value, index) => hashWithSaltDeterministic(vSalts[index], value));
        const vVerifyMerkleRoot = buildPoseidonMerkleTree(vLeafHashes);

        logger.info(`Blockchain Merkle Root: ${vaccine_block_merkle}, Calculated Merkle Root: ${vVerifyMerkleRoot}`);
        const isVaccineValid = vaccine_block_merkle.toLowerCase() === vVerifyMerkleRoot.toLowerCase();

        // ── Sales verification ──
        const salesData = await contract.methods.getSalesData(decodedPigId).call();
        const sales_block_merkle = salesData[1];
        const sales_cid = salesData[2];

        const salesQuery = `SELECT * FROM sales WHERE pig_id = $1`;
        const salesResult = await pool.query(salesQuery, [decodedPigId]);

        if (salesResult.rows.length === 0) {
            logger.warn('Product not found in database');
            return res.status(404).json({ message: 'Product not found in database' });
        }

        const { ssalt1, ssalt2, ssalt3, ssalt4, ssalt5, ssalt6, ssalt7 } = salesResult.rows[0];
        const sUrl = `https://gateway.pinata.cloud/ipfs/${sales_cid}`;
        const sResponse = await axios.get(sUrl);
        const sJson = sResponse.data;

        const sRawValues = [sJson.saleId, decodedPigId, sJson.saleDate, sJson.finalWeight, sJson.buyerName, sJson.buyerContact, sJson.price];
        const sSalts = [ssalt1, ssalt2, ssalt3, ssalt4, ssalt5, ssalt6, ssalt7];
        const sLeafHashes = sRawValues.map((value, index) => hashWithSaltDeterministic(sSalts[index], value));
        const sVerifyMerkleRoot = buildPoseidonMerkleTree(sLeafHashes);

        logger.info(`Blockchain Merkle Root: ${sales_block_merkle}, Calculated Merkle Root: ${sVerifyMerkleRoot}`);
        const isSaleValid = sales_block_merkle.toLowerCase() === sVerifyMerkleRoot.toLowerCase();

        // ── Final result ──
        if (isPigValid && isVaccineValid && isSaleValid) {
            const verificationResult = { message: 'Product is Authentic', status: 'Verified' };
            logger.info('Product Verified: Authentic');
            await redisClient.set(cacheKey, JSON.stringify(verificationResult), 'EX', 3600);
            return res.json(verificationResult);
        } else {
            const verificationResult = { message: 'Product data is tampered', status: 'Tampered' };
            logger.warn('Product Verification Failed: Data Tampered');
            await redisClient.set(cacheKey, JSON.stringify(verificationResult), 'EX', 600);
            return res.json(verificationResult);
        }
    } catch (error) {
        logger.error(`Error: ${error.message}`);
        res.status(500).send('Error verifying data');
    }
});

// ─── Error Handler ────────────────────────────────────────────────────────────

app.use((err, req, res, next) => {
    logger.error(`Server error: ${err.message}`);
    res.status(500).json({ error: 'Internal server error' });
});

// ─── Boot: Init Poseidon FIRST, then start server ─────────────────────────────

const PORT = process.env.PORT || 6000;

(async () => {
    try {
        await initPoseidon();
        app.listen(PORT, () => {
            logger.info(`Server running on port ${PORT}`);
        });
    } catch (err) {
        logger.error(`Failed to initialize server: ${err.message}`);
        process.exit(1);
    }
})();

export default app;