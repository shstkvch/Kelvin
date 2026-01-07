import { Database } from './database';

const TABLE_NAME = '_kelvin_server_meta';

function ensureServerMetaTable(db: Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

export function setServerPort(db: Database, port: number): void {
  ensureServerMetaTable(db);
  db.run(
    `INSERT OR REPLACE INTO ${TABLE_NAME} (key, value, updated_at)
     VALUES ('port', ?, datetime('now'))`,
    [port.toString()]
  );
  db.save();
}

export function getServerPort(db: Database): number | null {
  ensureServerMetaTable(db);
  const record = db.queryOne(
    `SELECT value FROM ${TABLE_NAME} WHERE key = 'port'`
  ) as { value: string } | null;

  if (!record) return null;
  return parseInt(record.value, 10);
}
