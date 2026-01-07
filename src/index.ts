#!/usr/bin/env node

import { Command } from 'commander';
import { serve } from './cli/serve';
import { check } from './cli/check';
import { migrate } from './cli/migrate';
import * as fs from 'fs';
import * as path from 'path';

// Read version from package.json
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

const program = new Command();

program
  .name('kelvin')
  .description('Kelvin - A declarative language for CRUD apps')
  .version(packageJson.version);

program
  .command('serve')
  .description('Start the development server')
  .argument('<file>', 'Path to .kelvin file')
  .option('-p, --port <port>', 'Port to listen on', '3000')
  .option('--db <path>', 'Path to SQLite database file')
  .option('--no-watch', 'Disable hot reload file watching')
  .action(async (file, options) => {
    await serve(file, {
      port: parseInt(options.port),
      dbPath: options.db,
      watch: options.watch,
    });
  });

program
  .command('check')
  .description('Validate a .kelvin file')
  .argument('<file>', 'Path to .kelvin file')
  .action(async (file) => {
    await check(file);
  });

program
  .command('migrate')
  .description('Run database migrations')
  .argument('<file>', 'Path to .kelvin file')
  .option('--db <path>', 'Path to SQLite database file')
  .action(async (file, options) => {
    await migrate(file, { dbPath: options.db });
  });

program.parse();
