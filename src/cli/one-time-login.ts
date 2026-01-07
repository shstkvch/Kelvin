import * as fs from 'fs';
import * as path from 'path';
import { Parser } from '../parser/parser';
import { SemanticAnalyzer } from '../analyzer/semantic-analyzer';
import { Database } from '../runtime/database';
import { Migrator } from '../schema/migrator';
import { createOTLToken } from '../auth/one-time-login';
import { getServerPort } from '../runtime/server-meta';

export interface OneTimeLoginOptions {
  db?: string;
  port?: string;
}

export async function oneTimeLogin(
  filePath: string,
  email: string,
  options: OneTimeLoginOptions
): Promise<void> {
  const absolutePath = path.resolve(filePath);

  // Check file exists
  if (!fs.existsSync(absolutePath)) {
    console.error(`Error: File not found: ${absolutePath}`);
    process.exit(1);
  }

  // Read and parse
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
    console.error('Semantic errors found. Run kelvin check first.');
    process.exit(1);
  }

  // Find User entity
  const userEntity = ast.entities.find(e => e.name === 'User');
  if (!userEntity) {
    console.error(`Error: No User entity defined in ${ast.name}`);
    console.error('A User entity with an email field is required for authentication.');
    process.exit(1);
  }

  // Initialize database
  const dbPath = options.db || path.join(
    path.dirname(absolutePath),
    `${ast.name.toLowerCase()}.db`
  );

  const db = new Database();
  await db.init(dbPath);

  // Run migrations to ensure tables exist
  const migrator = new Migrator(db, ast);
  await migrator.migrate();

  // Find user by email
  const user = db.queryOne('SELECT id, email FROM users WHERE email = ?', [email]) as { id: string; email: string } | null;

  if (!user) {
    console.error(`Error: No user found with email ${email}`);
    db.close();
    process.exit(1);
  }

  // Generate one-time login token (15 minutes expiry)
  const token = createOTLToken(db, user.id, 15);

  // Get port: prefer explicit option, then stored port from running server, then default
  const storedPort = getServerPort(db);
  const port = options.port || (storedPort ? storedPort.toString() : '3000');

  db.close();

  const loginUrl = `http://localhost:${port}/admin/login?token=${token}`;

  console.log('');
  console.log('One-time login link generated:');
  console.log('');
  console.log(`  ${loginUrl}`);
  console.log('');
  console.log('Expires in 15 minutes. This link can only be used once.');
}
