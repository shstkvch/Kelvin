import initSqlJs, { Database as SqlJsDatabase, SqlJsStatic } from 'sql.js';
import * as fs from 'fs';
import * as path from 'path';

let SQL: SqlJsStatic | null = null;

export interface QueryResult {
  columns: string[];
  values: unknown[][];
}

export class Database {
  private db: SqlJsDatabase | null = null;
  private dbPath: string | null = null;

  async init(dbPath?: string): Promise<void> {
    if (!SQL) {
      SQL = await initSqlJs();
    }

    this.dbPath = dbPath || null;

    if (dbPath && fs.existsSync(dbPath)) {
      const buffer = fs.readFileSync(dbPath);
      this.db = new SQL.Database(buffer);
    } else {
      this.db = new SQL.Database();
    }
  }

  exec(sql: string): void {
    if (!this.db) throw new Error('Database not initialized');
    this.db.run(sql);
  }

  run(sql: string, params: unknown[] = []): void {
    if (!this.db) throw new Error('Database not initialized');
    this.db.run(sql, params as (string | number | null | Uint8Array)[]);
  }

  query(sql: string, params: unknown[] = []): QueryResult {
    if (!this.db) throw new Error('Database not initialized');
    const stmt = this.db.prepare(sql);
    stmt.bind(params as (string | number | null | Uint8Array)[]);

    const columns: string[] = stmt.getColumnNames();
    const values: unknown[][] = [];

    while (stmt.step()) {
      values.push(stmt.get() as unknown[]);
    }

    stmt.free();

    return { columns, values };
  }

  queryOne(sql: string, params: unknown[] = []): Record<string, unknown> | null {
    const result = this.query(sql, params);
    if (result.values.length === 0) return null;

    const row: Record<string, unknown> = {};
    for (let i = 0; i < result.columns.length; i++) {
      row[result.columns[i]] = result.values[0][i];
    }
    return row;
  }

  queryAll(sql: string, params: unknown[] = []): Record<string, unknown>[] {
    const result = this.query(sql, params);
    return result.values.map(row => {
      const obj: Record<string, unknown> = {};
      for (let i = 0; i < result.columns.length; i++) {
        obj[result.columns[i]] = row[i];
      }
      return obj;
    });
  }

  save(): void {
    if (!this.db || !this.dbPath) return;
    const data = this.db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(this.dbPath, buffer);
  }

  close(): void {
    if (this.db) {
      if (this.dbPath) {
        this.save();
      }
      this.db.close();
      this.db = null;
    }
  }

  getTableNames(): string[] {
    const result = this.query(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
    );
    return result.values.map(row => row[0] as string);
  }

  tableExists(tableName: string): boolean {
    const result = this.queryOne(
      "SELECT name FROM sqlite_master WHERE type='table' AND name = ?",
      [tableName]
    );
    return result !== null;
  }
}
