import { Database } from '../runtime/database';
import { SchemaGenerator } from './generator';
import { AppNode } from '../parser/ast';

export interface MigrationResult {
  created: string[];
  errors: string[];
}

export class Migrator {
  constructor(private db: Database, private ast: AppNode) {}

  async migrate(): Promise<MigrationResult> {
    const generator = new SchemaGenerator(this.ast);
    const statements = generator.generateSQL();

    const created: string[] = [];
    const errors: string[] = [];

    // Create migrations table if it doesn't exist
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS _kelvin_migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    for (const sql of statements) {
      try {
        // Extract table name from CREATE TABLE or CREATE INDEX
        const match = sql.match(/CREATE (?:TABLE|INDEX) (?:IF NOT EXISTS )?(\w+)/i);
        const name = match ? match[1] : 'unknown';

        // Check if already applied (for tables)
        if (sql.includes('CREATE TABLE')) {
          if (this.db.tableExists(name)) {
            continue; // Skip existing tables
          }
        }

        // Check if index already exists
        if (sql.includes('CREATE INDEX')) {
          const indexExists = this.db.queryOne(
            "SELECT name FROM sqlite_master WHERE type='index' AND name = ?",
            [name]
          );
          if (indexExists) {
            continue;
          }
        }

        this.db.exec(sql);
        created.push(name);

        // Record migration
        this.db.run(
          'INSERT INTO _kelvin_migrations (name) VALUES (?)',
          [name]
        );
      } catch (error) {
        errors.push(`Failed to execute: ${sql.substring(0, 50)}... - ${error}`);
      }
    }

    return { created, errors };
  }

  async dryRun(): Promise<string[]> {
    const generator = new SchemaGenerator(this.ast);
    const statements = generator.generateSQL();
    const pending: string[] = [];

    for (const sql of statements) {
      const match = sql.match(/CREATE (?:TABLE|INDEX) (?:IF NOT EXISTS )?(\w+)/i);
      const name = match ? match[1] : 'unknown';

      if (sql.includes('CREATE TABLE')) {
        if (!this.db.tableExists(name)) {
          pending.push(sql);
        }
      } else if (sql.includes('CREATE INDEX')) {
        const indexExists = this.db.queryOne(
          "SELECT name FROM sqlite_master WHERE type='index' AND name = ?",
          [name]
        );
        if (!indexExists) {
          pending.push(sql);
        }
      }
    }

    return pending;
  }
}
