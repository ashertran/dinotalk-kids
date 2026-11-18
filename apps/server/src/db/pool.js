import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import pg from "pg";
import { EMBED_DIM } from "@dinotalk/shared";
import { config, SERVER_ROOT } from "../config/env.js";

const SCHEMA_PATH = path.join(SERVER_ROOT, "db/schema.sql");

export let pool = new pg.Pool({ connectionString: config.databaseUrl });

export let hasPgVector = false;

async function tryConnect(connStr) {
  const testPool = new pg.Pool({ connectionString: connStr, connectionTimeoutMillis: 2500 });
  try {
    const client = await testPool.connect();
    client.release();
    return testPool;
  } catch (err) {
    await testPool.end().catch(() => {});
    throw err;
  }
}

function quoteIdent(name) {
  return `"${String(name).replace(/"/g, '""')}"`;
}

function quoteLiteral(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

// Dev local: tự tạo role + database theo DATABASE_URL bằng tài khoản admin của Postgres trên máy.
// Role app chỉ có LOGIN (không SUPERUSER); extension được cài bằng tài khoản admin.
async function bootstrapLocalDatabase(originalErr) {
  const target = new URL(config.databaseUrl);
  const appUser = decodeURIComponent(target.username);
  const appPassword = decodeURIComponent(target.password);
  const appDb = target.pathname.replace(/^\//, "");
  const host = `${target.hostname}:${target.port || 5432}`;
  const osUser = process.env.USER || os.userInfo().username || "postgres";

  const adminBases = [
    `postgresql://${osUser}@${host}`,
    `postgresql://postgres@${host}`,
    `postgresql://postgres:postgres@${host}`
  ];

  let adminPool = null;
  let adminBase = null;
  for (const base of adminBases) {
    for (const db of ["postgres", "template1"]) {
      try {
        adminPool = await tryConnect(`${base}/${db}`);
        adminBase = base;
        break;
      } catch {}
    }
    if (adminPool) break;
  }
  if (!adminPool) throw originalErr;

  console.log(`🔧 Đang tự động khởi tạo role '${appUser}' và database '${appDb}'...`);
  try {
    const roleCheck = await adminPool.query(`SELECT 1 FROM pg_roles WHERE rolname = $1`, [appUser]);
    if (roleCheck.rowCount === 0) {
      await adminPool.query(`CREATE ROLE ${quoteIdent(appUser)} WITH LOGIN PASSWORD ${quoteLiteral(appPassword)}`);
      console.log(`✅ Đã tạo role '${appUser}'`);
    }
    const dbCheck = await adminPool.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [appDb]);
    if (dbCheck.rowCount === 0) {
      await adminPool.query(`CREATE DATABASE ${quoteIdent(appDb)} OWNER ${quoteIdent(appUser)}`);
      console.log(`✅ Đã tạo database '${appDb}'`);
    }
  } finally {
    await adminPool.end().catch(() => {});
  }

  // Cài extension bằng quyền admin (vector không phải trusted extension)
  const adminOnAppDb = await tryConnect(`${adminBase}/${appDb}`).catch(() => null);
  if (adminOnAppDb) {
    try {
      await adminOnAppDb.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
      await adminOnAppDb.query(`CREATE EXTENSION IF NOT EXISTS vector`).catch(() => {});
    } finally {
      await adminOnAppDb.end().catch(() => {});
    }
  }

  pool = new pg.Pool({ connectionString: config.databaseUrl });
}

async function ensureExtensions() {
  await pool.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`).catch(() => {});
  await pool.query(`CREATE EXTENSION IF NOT EXISTS vector`).catch(() => {});
  const ext = await pool.query(`SELECT 1 FROM pg_extension WHERE extname = 'vector'`);
  hasPgVector = ext.rowCount > 0;
  if (!hasPgVector) {
    console.warn("ℹ️ Postgres hiện tại chưa cài extension 'vector' (pgvector) — Đã bật chế độ Vector JSONB tương thích.");
  }
}

// db/schema.sql là nguồn schema duy nhất (cũng được Docker chạy lúc init).
// Khi không có pgvector: đổi vector(N) -> JSONB và bỏ các index HNSW.
async function loadSchemaSql() {
  let sql = await fs.readFile(SCHEMA_PATH, "utf8");
  sql = sql
    .split("\n")
    .filter(line => !/^\s*CREATE EXTENSION/i.test(line))
    .filter(line => hasPgVector || !/USING hnsw/i.test(line))
    .join("\n");
  if (!hasPgVector) sql = sql.replace(new RegExp(`vector\\(${EMBED_DIM}\\)`, "g"), "JSONB");
  return sql;
}

export async function ensureDatabaseReady() {
  try {
    const client = await pool.connect();
    client.release();
  } catch (err) {
    const msg = String(err.message || "");
    if (msg.includes("does not exist") || err.code === "28000" || err.code === "3D000") {
      await bootstrapLocalDatabase(err);
    } else {
      throw err;
    }
  }

  await ensureExtensions();
  await pool.query(await loadSchemaSql());
}
