import * as fs from 'fs';
import * as path from 'path';
import { input, password, select } from '@inquirer/prompts';
import { v4 as uuidv4 } from 'uuid';
import { Parser } from '../parser/parser';
import { SemanticAnalyzer } from '../analyzer/semantic-analyzer';
import { Database } from '../runtime/database';
import { Migrator } from '../schema/migrator';
import { hashPassword } from '../auth/password';
import { FieldNode } from '../parser/ast';

export interface CreateUserOptions {
  db?: string;
}

export async function createUser(filePath: string, options: CreateUserOptions): Promise<void> {
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

  // Get role options from enum (if defined)
  const roleField = userEntity.fields.find((f: FieldNode) => f.name === 'role');
  let roleOptions: string[] = ['user', 'admin'];
  if (roleField && roleField.fieldType.kind === 'enum') {
    roleOptions = roleField.fieldType.values;
  }

  // Determine default role (prefer 'admin' if available)
  const defaultRole = roleOptions.includes('admin') ? 'admin' : roleOptions[0];

  console.log(`Creating user for ${ast.name}...`);
  console.log('');

  // Interactive prompts
  const email = await input({
    message: 'Email',
    default: 'admin@example.com',
    validate: (value: string) => {
      if (!value.includes('@')) {
        return 'Please enter a valid email address';
      }
      return true;
    },
  });

  const userPassword = await password({
    message: 'Password',
    mask: '*',
    validate: (value: string) => {
      if (value.length < 1) {
        return 'Password cannot be empty';
      }
      return true;
    },
  });

  const confirmPassword = await password({
    message: 'Confirm password',
    mask: '*',
  });

  if (userPassword !== confirmPassword) {
    console.error('');
    console.error('Error: Passwords do not match');
    process.exit(1);
  }

  // Get name if User entity has a name field
  const hasNameField = userEntity.fields.some((f: FieldNode) => f.name === 'name');
  let name = 'Admin';
  if (hasNameField) {
    name = await input({
      message: 'Name',
      default: 'Admin',
    });
  }

  // Get role if User entity has a role field
  let role = defaultRole;
  if (roleField) {
    role = await select({
      message: 'Role',
      choices: roleOptions.map(r => ({ value: r, name: r })),
      default: defaultRole,
    });
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

  // Check for duplicate email
  const existing = db.queryOne('SELECT id FROM users WHERE email = ?', [email]);
  if (existing) {
    console.error('');
    console.error(`Error: User with email ${email} already exists`);
    db.close();
    process.exit(1);
  }

  // Create user
  const id = uuidv4();
  const now = new Date().toISOString();
  const passwordHash = await hashPassword(userPassword);

  // Build insert statement dynamically based on available fields
  const fields = ['id', 'email', 'password_hash', 'created', 'updated'];
  const values: unknown[] = [id, email, passwordHash, now, now];

  if (hasNameField) {
    fields.push('name');
    values.push(name);
  }

  if (roleField) {
    fields.push('role');
    values.push(role);
  }

  const placeholders = fields.map(() => '?').join(', ');
  const sql = `INSERT INTO users (${fields.join(', ')}) VALUES (${placeholders})`;

  db.run(sql, values);
  db.close();

  console.log('');
  console.log('User created successfully!');
  console.log('');
  console.log(`  Email: ${email}`);
  if (hasNameField) {
    console.log(`  Name:  ${name}`);
  }
  if (roleField) {
    console.log(`  Role:  ${role}`);
  }
  console.log(`  ID:    ${id}`);
}
