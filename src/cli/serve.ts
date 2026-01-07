import * as fs from 'fs';
import * as path from 'path';
import chokidar from 'chokidar';
import { Parser } from '../parser/parser';
import { SemanticAnalyzer } from '../analyzer/semantic-analyzer';
import { Database } from '../runtime/database';
import { QueryBuilder } from '../runtime/query-builder';
import { Migrator } from '../schema/migrator';
import { createServer, AppContext } from '../api/server';
import { AppNode } from '../parser/ast';
import { setServerPort } from '../runtime/server-meta';

export interface ServeOptions {
  port: number;
  dbPath?: string;
  watch?: boolean;
}

interface LoadResult {
  ast: AppNode;
  viewCount: number;
  entityCount: number;
}

function loadApp(absolutePath: string, isReload: boolean = false): LoadResult | null {
  const prefix = isReload ? '  ' : '';

  // Read and parse
  if (!isReload) {
    console.log(`Parsing ${path.basename(absolutePath)}...`);
  }

  const source = fs.readFileSync(absolutePath, 'utf-8');

  let ast: AppNode;
  try {
    const parser = new Parser(source);
    ast = parser.parse();
    if (!isReload) {
      console.log(`  Found ${ast.entities.length} entities, ${ast.views.length} views`);
    }
  } catch (err) {
    console.error(`${prefix}Parse error:`, (err as Error).message);
    return null;
  }

  // Run semantic analysis
  const analyzer = new SemanticAnalyzer();
  const result = analyzer.analyze(ast);

  if (result.errors.length > 0) {
    console.error(`${prefix}Semantic errors:`);
    for (const error of result.errors) {
      console.error(`${prefix}  [${error.code}] ${error.message}`);
    }
    return null;
  }

  return {
    ast,
    viewCount: ast.views.length,
    entityCount: ast.entities.length,
  };
}

export async function serve(filePath: string, options: ServeOptions): Promise<void> {
  const absolutePath = path.resolve(filePath);

  // Check file exists
  if (!fs.existsSync(absolutePath)) {
    console.error(`Error: File not found: ${absolutePath}`);
    process.exit(1);
  }

  // Initial load
  const initialResult = loadApp(absolutePath);
  if (!initialResult) {
    process.exit(1);
  }

  let { ast } = initialResult;

  // Initialize database
  const dbPath = options.dbPath || path.join(path.dirname(absolutePath), `${ast.name.toLowerCase()}.db`);
  console.log(`Initializing database at ${dbPath}...`);

  const db = new Database();
  await db.init(dbPath);

  // Run migrations
  console.log('Running migrations...');
  let migrator = new Migrator(db, ast);
  await migrator.migrate();
  console.log('  Migrations complete');

  // Generate JWT secret (in production, this should be configured)
  const jwtSecret = process.env.JWT_SECRET || 'kelvin-dev-secret-change-in-production';

  // Create and start server
  const { app, appCtx } = createServer(ast, db, { jwtSecret });

  const server = app.listen(options.port, () => {
    // Store the port so other commands (like one-time-login) can use it
    setServerPort(db, options.port);

    console.log('');
    console.log(`${ast.name} is running!`);
    console.log('');
    console.log(`  API:   http://localhost:${options.port}/api`);
    console.log(`  Admin: http://localhost:${options.port}/admin`);
    console.log('');
    console.log('Views:');
    for (const view of ast.views) {
      const visibility = view.visibility === 'public' ? '(public)' : '(authenticated)';
      console.log(`  - ${view.name} ${visibility}`);
    }
    console.log('');

    if (options.watch !== false) {
      console.log('Watching for changes...');
      console.log('');
    }

    console.log('Press Ctrl+C to stop');
  });

  // Set up file watcher for hot reload
  if (options.watch !== false) {
    let isReloading = false;

    const watcher = chokidar.watch(absolutePath, {
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval: 50,
      },
    });

    watcher.on('change', async () => {
      if (isReloading) return;
      isReloading = true;

      console.log('');
      console.log('File changed, reloading...');

      const result = loadApp(absolutePath, true);

      if (result) {
        const { ast: newAst, viewCount, entityCount } = result;

        // Check if views changed (would need server restart for new routes)
        const viewsChanged = newAst.views.length !== ast.views.length ||
          newAst.views.some((v, i) => ast.views[i]?.name !== v.name);

        // Run migrations for any new entities
        migrator = new Migrator(db, newAst);
        await migrator.migrate();

        // Update the mutable appCtx - routes will use new AST on next request
        ast = newAst;
        appCtx.ast = newAst;
        appCtx.queryBuilder = new QueryBuilder(db, newAst);

        console.log(`  Reloaded: ${entityCount} entities, ${viewCount} views`);

        if (viewsChanged) {
          console.log('  Note: View structure changed. Restart server for new routes.');
        }

        console.log('');
      } else {
        console.log('  Reload failed - keeping previous version');
        console.log('');
      }

      isReloading = false;
    });

    // Clean up watcher on exit
    process.on('SIGINT', () => {
      watcher.close();
      server.close();
      db.close();
      process.exit(0);
    });
  }
}
