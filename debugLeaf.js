import pg from "pg";
import { buildPoseidon } from "circomlibjs";
import dotenv from "dotenv";

dotenv.config();
const { Pool } = pg;

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT
});

const FIELD_MODULUS = BigInt(
  "21888242871839275222246405745257275088548364400416034343698204186575808495617"
);

function stringToField(str) {
  const bytes = Buffer.from(String(str), "utf8");
  let val = BigInt(0);
  for (const b of bytes) {
    val = (val << 8n) | BigInt(b);
  }
  return val % FIELD_MODULUS;
}

function saltToField(saltHex) {
  return BigInt("0x" + saltHex) % FIELD_MODULUS;
}

async function run(pigId) {
  const poseidon = await buildPoseidon();
  const F = poseidon.F;

  const result = await pool.query(
    "SELECT * FROM pig_profiles WHERE pig_id = $1",
    [pigId]
  );

  if (result.rows.length === 0) {
    console.log("Pig not found");
    return;
  }

  const pig = result.rows[0];

  const values = [
    pig.pig_id,
    pig.birth_date,
    pig.sold_at,
    pig.breed,
    pig.genetic_lineage,
    pig.birth_weight,
    pig.ear_tag,
    pig.sex,
    pig.status,
    pig.farm_id
  ];

  const salts = [
    pig.salt1,
    pig.salt2,
    pig.salt3,
    pig.salt4,
    pig.salt5,
    pig.salt6,
    pig.salt7,
    pig.salt8,
    pig.salt9,
    pig.salt10
  ];

  const leafHashes = [];

  for (let i = 0; i < values.length; i++) {
    const saltField = saltToField(salts[i]);
    const valueField = stringToField(values[i]);

    const hash = poseidon([saltField, valueField]);
    leafHashes.push(F.toObject(hash).toString());
  }

  // pad to 16
  while (leafHashes.length < 16) {
    leafHashes.push("0");
  }

  console.log("Leaf Hashes:");
  console.log(JSON.stringify(leafHashes, null, 2));

  process.exit();
}

run(123);   // change pig ID here