import { Database } from '../../src/runtime/database';
import {
  generateOTLToken,
  ensureOTLTable,
  createOTLToken,
  consumeOTLToken,
  cleanupOTLTokens,
} from '../../src/auth/one-time-login';
import { v4 as uuidv4 } from 'uuid';

describe('One-Time Login', () => {
  let db: Database;

  beforeEach(async () => {
    db = new Database();
    await db.init();

    // Create users table for FK
    db.exec(`
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE,
        password_hash TEXT
      )
    `);
  });

  afterEach(() => {
    db.close();
  });

  describe('generateOTLToken', () => {
    it('generates base64url encoded token', () => {
      const token = generateOTLToken();

      expect(token).toBeDefined();
      expect(token.length).toBeGreaterThan(30);
      // base64url uses only alphanumeric, - and _
      expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it('generates unique tokens', () => {
      const tokens = new Set();
      for (let i = 0; i < 100; i++) {
        tokens.add(generateOTLToken());
      }
      expect(tokens.size).toBe(100);
    });
  });

  describe('ensureOTLTable', () => {
    it('creates table if not exists', () => {
      ensureOTLTable(db);

      const result = db.queryOne(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='_kelvin_otl_tokens'"
      );

      expect(result).not.toBeNull();
    });

    it('is idempotent', () => {
      ensureOTLTable(db);
      ensureOTLTable(db);

      const result = db.queryOne(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='_kelvin_otl_tokens'"
      );

      expect(result).not.toBeNull();
    });
  });

  describe('createOTLToken', () => {
    it('creates token for user', () => {
      const userId = uuidv4();
      db.run('INSERT INTO users (id, email) VALUES (?, ?)', [userId, 'test@example.com']);

      const token = createOTLToken(db, userId);

      expect(token).toBeDefined();
      expect(token.length).toBeGreaterThan(30);
    });

    it('stores token in database', () => {
      const userId = uuidv4();
      db.run('INSERT INTO users (id, email) VALUES (?, ?)', [userId, 'test@example.com']);

      const token = createOTLToken(db, userId);

      const record = db.queryOne(
        'SELECT * FROM _kelvin_otl_tokens WHERE token = ?',
        [token]
      );

      expect(record).not.toBeNull();
      expect(record?.user_id).toBe(userId);
      expect(record?.used_at).toBeNull();
    });

    it('uses custom expiration time', () => {
      const userId = uuidv4();
      db.run('INSERT INTO users (id, email) VALUES (?, ?)', [userId, 'test@example.com']);

      const token = createOTLToken(db, userId, 60); // 60 minutes

      const record = db.queryOne(
        'SELECT * FROM _kelvin_otl_tokens WHERE token = ?',
        [token]
      ) as { expires_at: string } | null;

      expect(record).not.toBeNull();

      const expiresAt = new Date(record!.expires_at);
      const now = new Date();
      const diffMinutes = (expiresAt.getTime() - now.getTime()) / 1000 / 60;

      // Should be approximately 60 minutes (allow for test execution time)
      expect(diffMinutes).toBeGreaterThan(58);
      expect(diffMinutes).toBeLessThan(62);
    });
  });

  describe('consumeOTLToken', () => {
    it('consumes valid token', () => {
      const userId = uuidv4();
      db.run('INSERT INTO users (id, email) VALUES (?, ?)', [userId, 'test@example.com']);

      const token = createOTLToken(db, userId);
      const result = consumeOTLToken(db, token);

      expect(result.valid).toBe(true);
      expect(result.userId).toBe(userId);
      expect(result.error).toBeUndefined();
    });

    it('marks token as used', () => {
      const userId = uuidv4();
      db.run('INSERT INTO users (id, email) VALUES (?, ?)', [userId, 'test@example.com']);

      const token = createOTLToken(db, userId);
      consumeOTLToken(db, token);

      const record = db.queryOne(
        'SELECT * FROM _kelvin_otl_tokens WHERE token = ?',
        [token]
      );

      expect(record?.used_at).not.toBeNull();
    });

    it('rejects already used token', () => {
      const userId = uuidv4();
      db.run('INSERT INTO users (id, email) VALUES (?, ?)', [userId, 'test@example.com']);

      const token = createOTLToken(db, userId);
      consumeOTLToken(db, token); // First use
      const result = consumeOTLToken(db, token); // Second use

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Token already used');
    });

    it('rejects non-existent token', () => {
      const result = consumeOTLToken(db, 'non-existent-token');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Token not found');
    });

    it('rejects expired token', () => {
      const userId = uuidv4();
      db.run('INSERT INTO users (id, email) VALUES (?, ?)', [userId, 'test@example.com']);

      // Create token with 0 minutes expiration (already expired)
      const token = createOTLToken(db, userId, 0);

      // Wait a bit for the token to be expired
      const result = consumeOTLToken(db, token);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Token expired');
    });
  });

  describe('cleanupOTLTokens', () => {
    it('removes used tokens', () => {
      const userId = uuidv4();
      db.run('INSERT INTO users (id, email) VALUES (?, ?)', [userId, 'test@example.com']);

      const token = createOTLToken(db, userId);
      consumeOTLToken(db, token);

      cleanupOTLTokens(db);

      const record = db.queryOne(
        'SELECT * FROM _kelvin_otl_tokens WHERE token = ?',
        [token]
      );

      expect(record).toBeNull();
    });
  });

  describe('cross-instance token consumption', () => {
    const fs = require('fs');
    const path = require('path');
    const testDbPath = path.join(__dirname, 'test-otl.db');

    afterEach(() => {
      if (fs.existsSync(testDbPath)) {
        fs.unlinkSync(testDbPath);
      }
    });

    it('consumes token created by different database instance', async () => {
      // Simulate CLI: create token in one database instance
      const db1 = new Database();
      await db1.init(testDbPath);
      db1.exec(`
        CREATE TABLE users (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE,
          password_hash TEXT
        )
      `);
      const userId = uuidv4();
      db1.run('INSERT INTO users (id, email) VALUES (?, ?)', [userId, 'test@example.com']);
      const token = createOTLToken(db1, userId);
      db1.close(); // Saves to disk

      // Simulate server: open database before CLI creates token
      const db2 = new Database();
      await db2.init(testDbPath);

      // Now simulate CLI creating another token while server is running
      const db3 = new Database();
      await db3.init(testDbPath);
      const newToken = createOTLToken(db3, userId);
      db3.close(); // Saves to disk

      // Server should be able to consume the new token (due to reload)
      const result = consumeOTLToken(db2, newToken);

      expect(result.valid).toBe(true);
      expect(result.userId).toBe(userId);

      db2.close();
    });
  });
});
