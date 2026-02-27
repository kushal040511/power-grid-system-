import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { query } from "../db/pool.js";
import { logAudit } from "../services/auditService.js";

const signAccessToken = (user) =>
  jwt.sign({ id: user.id, role: user.role, email: user.email }, process.env.JWT_SECRET, { expiresIn: "2h" });

const createRefreshToken = async (userId) => {
  const tokenId = crypto.randomUUID();
  const tokenSecret = crypto.randomBytes(32).toString("hex");
  const refreshToken = `${tokenId}.${tokenSecret}`;
  const tokenHash = await bcrypt.hash(tokenSecret, 10);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);

  await query(
    "INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at) VALUES ($1, $2, $3, $4)",
    [tokenId, userId, tokenHash, expiresAt]
  );

  return refreshToken;
};

export const register = async (req, res) => {
  const { name, email, password, region_id } = req.body;
  const existing = await query("SELECT id FROM users WHERE email = $1", [email]);
  if (existing.rows.length) return res.status(409).json({ message: "Email already exists" });

  const passwordHash = await bcrypt.hash(password, 10);
  const insert = await query(
    "INSERT INTO users (name, email, password_hash, role, region_id) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, role",
    [name, email, passwordHash, "analyst", region_id || null]
  );

  res.status(201).json(insert.rows[0]);
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  const userRes = await query("SELECT id, email, password_hash, role, name FROM users WHERE email = $1", [email]);
  const user = userRes.rows[0];
  if (!user) return res.status(401).json({ message: "Invalid credentials" });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ message: "Invalid credentials" });

  const token = signAccessToken(user);
  const refreshToken = await createRefreshToken(user.id);
  await logAudit({ userId: user.id, action: "login", ip: req.ip });
  res.json({ token, refreshToken, role: user.role, name: user.name });
};

export const refresh = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ message: "refreshToken required" });

  const [tokenId, tokenSecret] = refreshToken.split(".");
  if (!tokenId || !tokenSecret) return res.status(400).json({ message: "Invalid refresh token" });

  const tokenRes = await query(
    "SELECT id, user_id, token_hash, expires_at, revoked_at FROM refresh_tokens WHERE id = $1",
    [tokenId]
  );
  const tokenRow = tokenRes.rows[0];
  if (!tokenRow || tokenRow.revoked_at) return res.status(401).json({ message: "Refresh token invalid" });
  if (new Date(tokenRow.expires_at) < new Date()) return res.status(401).json({ message: "Refresh token expired" });

  const ok = await bcrypt.compare(tokenSecret, tokenRow.token_hash);
  if (!ok) return res.status(401).json({ message: "Refresh token invalid" });

  const userRes = await query("SELECT id, email, role FROM users WHERE id = $1", [tokenRow.user_id]);
  const user = userRes.rows[0];
  if (!user) return res.status(401).json({ message: "User not found" });

  const token = signAccessToken(user);
  res.json({ token });
};

export const logout = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.json({ message: "ok" });
  const [tokenId] = refreshToken.split(".");
  if (tokenId) {
    await query("UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1", [tokenId]);
  }
  res.json({ message: "ok" });
};
