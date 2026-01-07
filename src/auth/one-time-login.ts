import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { Database } from '../runtime/database';

export interface OTLToken {
  id: string;
  user_id: string;
  token: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

export interface ConsumeResult {
  valid: boolean;
  userId?: string;
  error?: string;
}

/**
 * Generate a cryptographically secure one-time login token
 */
export function generateOTLToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

/**
 * Ensure the OTL tokens table exists in the database
 */
export function ensureOTLTable(db: Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS _kelvin_otl_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      used_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create index for faster token lookups
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_otl_tokens_token ON _kelvin_otl_tokens(token)
  `);
}

/**
 * Create a one-time login token for a user
 * @param db Database instance
 * @param userId User ID to create token for
 * @param expiresInMinutes Token expiration time in minutes (default: 15)
 * @returns The generated token string
 */
export function createOTLToken(
  db: Database,
  userId: string,
  expiresInMinutes: number = 15
): string {
  ensureOTLTable(db);

  const id = uuidv4();
  const token = generateOTLToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + expiresInMinutes * 60 * 1000);

  db.run(
    `INSERT INTO _kelvin_otl_tokens (id, user_id, token, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    [id, userId, token, expiresAt.toISOString(), now.toISOString()]
  );

  return token;
}

/**
 * Consume a one-time login token
 * @param db Database instance
 * @param token Token string to consume
 * @returns Result with validity and user ID if valid
 */
export function consumeOTLToken(db: Database, token: string): ConsumeResult {
  ensureOTLTable(db);

  const record = db.queryOne(
    `SELECT * FROM _kelvin_otl_tokens WHERE token = ?`,
    [token]
  ) as OTLToken | null;

  if (!record) {
    return { valid: false, error: 'Token not found' };
  }

  if (record.used_at) {
    return { valid: false, error: 'Token already used' };
  }

  const expiresAt = new Date(record.expires_at);
  if (expiresAt < new Date()) {
    return { valid: false, error: 'Token expired' };
  }

  // Mark token as used
  db.run(
    `UPDATE _kelvin_otl_tokens SET used_at = ? WHERE id = ?`,
    [new Date().toISOString(), record.id]
  );

  return { valid: true, userId: record.user_id };
}

/**
 * Clean up expired and used tokens (optional maintenance)
 */
export function cleanupOTLTokens(db: Database): void {
  ensureOTLTable(db);

  db.run(
    `DELETE FROM _kelvin_otl_tokens
     WHERE used_at IS NOT NULL
     OR expires_at < datetime('now')`,
    []
  );
}
