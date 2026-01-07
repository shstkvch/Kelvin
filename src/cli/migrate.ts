import * as fs from 'fs';
import * as path from 'path';
import { Parser } from '../parser/parser';
import { SemanticAnalyzer } from '../analyzer/semantic-analyzer';
import { Database } from '../runtime/database';
import { Migrator } from '../schema/migrator';

export interface MigrateOptions {
  dbPath?: string;
}

export async function migrate(filePath: string, options: MigrateOptions): Promise<void> {
  const absolutePath = path.resolve(filePath);

  // Check file exists
  if (!fs.existsSync(absolutePath)) {
    console.error(`Error: File not found: ${absolutePath}`);
    process.exit(1);
  }

  // Read and parse
  console.log(`Parsing ${path.basename(filePath)}...`);
  const source = fs.readFileSync(absolutePath, 'utf-8');

  let ast;
  try {
    const parser = new Parser(source);
    ast = parser.parse();
  } catch (err) {
    console.error('Parse error:', (err as Error).message);
    process.exit(1);
  }

  // Run semantic analysis
  const analyzer = new SemanticAnalyzer();
  const result = analyzer.analyze(ast);

  if (result.errors.length > 0) {
    console.error('');
    console.error('Semantic errors:');
    for (const error of result.errors) {
      console.error(`  [${error.code}] ${error.message}`);
    }
    console.error('');
    console.error(`Found ${result.errors.length} error(s). Fix them before running migrations.`);
    process.exit(1);
  }

  // Initialize database
  const dbPath = options.dbPath || path.join(path.dirname(absolutePath), `${ast.name.toLowerCase()}.db`);
  console.log(`Database: ${dbPath}`);

  const db = new Database();
  await db.init(dbPath);

  // Run migrations
  console.log('Running migrations...');
  const migrator = new Migrator(db, ast);
  await migrator.migrate();

  console.log('Migrations complete.');
  db.close();
}
