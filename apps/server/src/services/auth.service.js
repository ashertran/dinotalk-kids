import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { config } from "../config/env.js";
import { pool } from "../db/pool.js";

const JWT_SECRET = config.jwtSecret;

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

function verifyPassword(password, stored) {
  const [salt, key] = stored.split(":");
  const derived = crypto.scryptSync(password, salt, 64);
  return crypto.timingSafeEqual(Buffer.from(key, "hex"), derived);
}

export async function registerParent({ email, password, kidNickname = "Minh", ageBand = "6-8", cefrLevel = "A0" }) {
  if (!email || !password) throw new Error("Vui lòng nhập email và mật khẩu");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const pwHash = hashPassword(password);
    const accRes = await client.query(
      `INSERT INTO accounts (email, password_hash) VALUES ($1, $2) RETURNING id, email, role`,
      [email.toLowerCase().trim(), pwHash]
    );
    const account = accRes.rows[0];
    const kidRes = await client.query(
      `INSERT INTO kid_profiles (account_id, nickname, age_band, cefr_level) VALUES ($1, $2, $3, $4) RETURNING *`,
      [account.id, kidNickname || "Minh", ageBand || "6-8", cefrLevel || "A0"]
    );
    await client.query("COMMIT");
    const kid = kidRes.rows[0];
    const token = jwt.sign({ accountId: account.id, kidId: kid.id, role: account.role }, JWT_SECRET, { expiresIn: "7d" });
    return { token, account, kid, kids: [kid], activeKid: kid };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function loginParent({ email, password }) {
  if (!email || !password) throw new Error("INVALID_CREDENTIALS");
  const accRes = await pool.query(`SELECT * FROM accounts WHERE email = $1`, [email.toLowerCase().trim()]);
  const account = accRes.rows[0];
  if (!account || !verifyPassword(password, account.password_hash)) {
    throw new Error("INVALID_CREDENTIALS");
  }
  const kidsRes = await pool.query(`SELECT * FROM kid_profiles WHERE account_id = $1 ORDER BY created_at ASC`, [account.id]);
  const activeKid = kidsRes.rows[0];
  const token = jwt.sign({ accountId: account.id, kidId: activeKid?.id, role: account.role }, JWT_SECRET, { expiresIn: "7d" });
  return {
    token,
    account: { id: account.id, email: account.email, role: account.role },
    kids: kidsRes.rows,
    activeKid,
    kid: activeKid
  };
}

export function requireAuth(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: "UNAUTHORIZED" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "INVALID_TOKEN" });
  }
}
