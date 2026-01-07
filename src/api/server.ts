import express, { Express, Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import { Database } from '../runtime/database';
import { QueryBuilder } from '../runtime/query-builder';
import { AppNode, ViewNode, ListBlockNode, CreateBlockNode, EditBlockNode, ActionNode } from '../parser/ast';
import { authMiddleware } from '../auth/middleware';
import { createAuthRouter } from './auth';
import { createAdminRouter } from '../admin/router';

export interface AppContext {
  db: Database;
  ast: AppNode;
  queryBuilder: QueryBuilder;
}

export interface RequestContext {
  authenticated: boolean;
  current_user?: string;
  role?: string;
}

declare global {
  namespace Express {
    interface Request {
      ctx?: RequestContext;
      appCtx?: AppContext;
    }
  }
}

export interface ServerOptions {
  jwtSecret?: string;
}

export interface ServerResult {
  app: Express;
  appCtx: AppContext;
}

export function createServer(ast: AppNode, db: Database, options: ServerOptions = {}): ServerResult {
  const app = express();
  const queryBuilder = new QueryBuilder(db, ast);
  const appCtx: AppContext = { db, ast, queryBuilder };

  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Attach app context and default auth state
  app.use((req, _res, next) => {
    req.appCtx = appCtx;
    req.ctx = {
      authenticated: false,
      current_user: undefined,
      role: undefined,
    };
    next();
  });

  // Auth middleware
  app.use(authMiddleware(options.jwtSecret));

  // Auth routes
  app.use('/auth', createAuthRouter(db, ast, options.jwtSecret));

  // Admin routes
  app.use('/admin', createAdminRouter(db, ast, options.jwtSecret));

  // Generate routes from views
  for (const view of ast.views) {
    registerViewRoutes(app, view, ast);
  }

  // Error handler
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Error:', err);
    res.status(500).json({
      error: {
        message: err.message,
        type: 'internal_error',
      },
    });
  });

  return { app, appCtx };
}

function registerViewRoutes(app: Express, view: ViewNode, ast: AppNode): void {
  const viewPath = `/api/${view.name}`;

  for (const block of view.blocks) {
    switch (block.type) {
      case 'ListBlock':
        registerListRoutes(app, viewPath, view, block, ast);
        break;
      case 'CreateBlock':
        registerCreateRoute(app, viewPath, view, block);
        break;
      case 'EditBlock':
        registerEditRoute(app, viewPath, view, block);
        break;
      case 'Action':
        registerActionRoute(app, viewPath, view, block);
        break;
    }
  }
}

function registerListRoutes(
  app: Express,
  viewPath: string,
  view: ViewNode,
  block: ListBlockNode,
  ast: AppNode
): void {
  const entityPath = toSnakeCase(block.entity);
  const route = `${viewPath}/${entityPath}`;

  // List endpoint
  app.get(route, async (req, res, next) => {
    try {
      // Check visibility
      const visibility = checkVisibility(view, req.ctx!);
      if (!visibility.allowed) {
        const status = visibility.reason === 'forbidden' ? 403 : 401;
        const message = visibility.reason === 'forbidden' ? 'Forbidden' : 'Unauthorized';
        return res.status(status).json({ error: { message, type: visibility.reason } });
      }

      const page = parseInt(req.query.page as string) || 1;
      const perPage = parseInt(req.query.per_page as string) || 20;
      const orderBy = req.query.order_by as string | undefined;
      const orderDir = (req.query.order_dir as 'asc' | 'desc') || 'asc';

      // Build filters from query params matching filterBy fields
      const filters: Record<string, unknown> = {};
      if (block.filterBy) {
        for (const filterField of block.filterBy) {
          if (req.query[filterField]) {
            filters[filterField] = req.query[filterField];
          }
        }
      }

      const result = await req.appCtx!.queryBuilder.list(
        block.entity,
        block,
        { current_user: req.ctx!.current_user, role: req.ctx!.role },
        { page, perPage, orderBy, orderDir, filters }
      );

      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  // Detail endpoint
  app.get(`${route}/:id`, async (req, res, next) => {
    try {
      const visibility = checkVisibility(view, req.ctx!);
      if (!visibility.allowed) {
        const status = visibility.reason === 'forbidden' ? 403 : 401;
        const message = visibility.reason === 'forbidden' ? 'Forbidden' : 'Unauthorized';
        return res.status(status).json({ error: { message, type: visibility.reason } });
      }

      const entity = await req.appCtx!.queryBuilder.findById(block.entity, req.params.id);
      if (!entity) {
        return res.status(404).json({ error: { message: 'Not found', type: 'not_found' } });
      }

      res.json({ data: entity });
    } catch (err) {
      next(err);
    }
  });

  // Delete endpoint (if delete action is allowed)
  if (block.actions?.includes('delete')) {
    app.delete(`${route}/:id`, async (req, res, next) => {
      try {
        const visibility = checkVisibility(view, req.ctx!);
        if (!visibility.allowed) {
          const status = visibility.reason === 'forbidden' ? 403 : 401;
          const message = visibility.reason === 'forbidden' ? 'Forbidden' : 'Unauthorized';
          return res.status(status).json({ error: { message, type: visibility.reason } });
        }

        await req.appCtx!.queryBuilder.delete(block.entity, req.params.id);
        res.json({ success: true });
      } catch (err) {
        next(err);
      }
    });
  }
}

function registerCreateRoute(
  app: Express,
  viewPath: string,
  view: ViewNode,
  block: CreateBlockNode
): void {
  const entityPath = toSnakeCase(block.entity);
  const route = `${viewPath}/${entityPath}`;

  app.post(route, async (req, res, next) => {
    try {
      const visibility = checkVisibility(view, req.ctx!);
      if (!visibility.allowed) {
        const status = visibility.reason === 'forbidden' ? 403 : 401;
        const message = visibility.reason === 'forbidden' ? 'Forbidden' : 'Unauthorized';
        return res.status(status).json({ error: { message, type: visibility.reason } });
      }

      // Validate input fields
      const data: Record<string, unknown> = {};
      for (const field of block.input) {
        if (req.body[field] !== undefined) {
          data[field] = req.body[field];
        }
      }

      // Execute then block assignments
      if (block.then) {
        for (const stmt of block.then.statements) {
          if (stmt.type === 'Assignment') {
            const targetField = stmt.target.path[stmt.target.path.length - 1];
            const value = evaluateExpression(stmt.value, req.ctx!, {});
            data[targetField] = value;
          }
        }
      }

      const entity = await req.appCtx!.queryBuilder.create(block.entity, data);
      res.status(201).json({ data: entity });
    } catch (err) {
      next(err);
    }
  });
}

function registerEditRoute(
  app: Express,
  viewPath: string,
  view: ViewNode,
  block: EditBlockNode
): void {
  const entityPath = toSnakeCase(block.entity);
  const route = `${viewPath}/${entityPath}/:id`;

  app.put(route, async (req, res, next) => {
    try {
      const visibility = checkVisibility(view, req.ctx!);
      if (!visibility.allowed) {
        const status = visibility.reason === 'forbidden' ? 403 : 401;
        const message = visibility.reason === 'forbidden' ? 'Forbidden' : 'Unauthorized';
        return res.status(status).json({ error: { message, type: visibility.reason } });
      }

      // Get existing entity
      const existing = await req.appCtx!.queryBuilder.findById(block.entity, req.params.id);
      if (!existing) {
        return res.status(404).json({ error: { message: 'Not found', type: 'not_found' } });
      }

      // Check require condition
      if (block.require) {
        const allowed = evaluateCondition(block.require, req.ctx!, { [block.alias || 'entity']: existing });
        if (!allowed) {
          return res.status(403).json({ error: { message: 'Forbidden', type: 'forbidden' } });
        }
      }

      // Validate input fields
      const data: Record<string, unknown> = {};
      for (const field of block.input) {
        if (req.body[field] !== undefined) {
          data[field] = req.body[field];
        }
      }

      const entity = await req.appCtx!.queryBuilder.update(block.entity, req.params.id, data);
      res.json({ data: entity });
    } catch (err) {
      next(err);
    }
  });
}

function registerActionRoute(
  app: Express,
  viewPath: string,
  view: ViewNode,
  action: ActionNode
): void {
  const entityPath = toSnakeCase(action.parameter.entity);
  const route = `${viewPath}/${entityPath}/:id/${action.name}`;

  app.post(route, async (req, res, next) => {
    try {
      const visibility = checkVisibility(view, req.ctx!);
      if (!visibility.allowed) {
        const status = visibility.reason === 'forbidden' ? 403 : 401;
        const message = visibility.reason === 'forbidden' ? 'Forbidden' : 'Unauthorized';
        return res.status(status).json({ error: { message, type: visibility.reason } });
      }

      // Get entity
      const entity = await req.appCtx!.queryBuilder.findById(action.parameter.entity, req.params.id);
      if (!entity) {
        return res.status(404).json({ error: { message: 'Not found', type: 'not_found' } });
      }

      // Check require condition
      if (action.require) {
        const context = { [action.parameter.name]: entity };
        const allowed = evaluateCondition(action.require, req.ctx!, context);
        if (!allowed) {
          return res.status(403).json({ error: { message: 'Forbidden', type: 'forbidden' } });
        }
      }

      // Execute then block
      const updates: Record<string, unknown> = {};
      for (const stmt of action.then.statements) {
        if (stmt.type === 'Assignment') {
          const targetField = stmt.target.path[stmt.target.path.length - 1];
          const context = { [action.parameter.name]: entity };
          const value = evaluateExpression(stmt.value, req.ctx!, context);
          updates[targetField] = value;
        }
      }

      const updated = await req.appCtx!.queryBuilder.update(
        action.parameter.entity,
        req.params.id,
        updates
      );

      res.json({ data: updated });
    } catch (err) {
      next(err);
    }
  });
}

interface VisibilityResult {
  allowed: boolean;
  reason: 'ok' | 'unauthenticated' | 'forbidden';
}

function checkVisibility(view: ViewNode, ctx: RequestContext): VisibilityResult {
  if (view.visibility === 'public') {
    return { allowed: true, reason: 'ok' };
  }

  // Default is authenticated
  if (!ctx.authenticated) {
    return { allowed: false, reason: 'unauthenticated' };
  }

  // Check require condition
  if (view.require) {
    const allowed = evaluateCondition(view.require, ctx, {});
    return { allowed, reason: allowed ? 'ok' : 'forbidden' };
  }

  return { allowed: true, reason: 'ok' };
}

function evaluateCondition(
  expr: any,
  ctx: RequestContext,
  entityContext: Record<string, unknown>
): boolean {
  if (expr.type === 'BinaryExpr') {
    const left = evaluateExpression(expr.left, ctx, entityContext);
    const right = evaluateExpression(expr.right, ctx, entityContext);

    switch (expr.operator) {
      case '==':
        return left === right;
      case '!=':
        return left !== right;
      case '>':
        return (left as number) > (right as number);
      case '>=':
        return (left as number) >= (right as number);
      case '<':
        return (left as number) < (right as number);
      case '<=':
        return (left as number) <= (right as number);
      case 'and':
        return !!left && !!right;
      case 'or':
        return !!left || !!right;
      case 'in':
        return Array.isArray(right) && right.includes(left);
      default:
        return false;
    }
  }

  if (expr.type === 'UnaryExpr') {
    const operand = evaluateExpression(expr.operand, ctx, entityContext);
    if (expr.operator === 'not' || expr.operator === '!') {
      return !operand;
    }
  }

  // Treat any truthy value as true
  return !!evaluateExpression(expr, ctx, entityContext);
}

function evaluateExpression(
  expr: any,
  ctx: RequestContext,
  entityContext: Record<string, unknown>
): unknown {
  if (expr.type === 'Literal') {
    return expr.value;
  }

  if (expr.type === 'FieldRef') {
    const path = expr.path as string[];

    // Context variables
    if (path[0] === 'current_user') {
      return ctx.current_user;
    }
    if (path[0] === 'role') {
      return ctx.role;
    }

    // Entity context (e.g., post.status)
    if (entityContext[path[0]]) {
      let value: unknown = entityContext[path[0]];
      for (let i = 1; i < path.length; i++) {
        if (value && typeof value === 'object') {
          value = (value as Record<string, unknown>)[path[i]];
        } else {
          return undefined;
        }
      }
      return value;
    }

    return undefined;
  }

  if (expr.type === 'UnaryExpr') {
    const operand = evaluateExpression(expr.operand, ctx, entityContext);
    if (expr.operator === '!' || expr.operator === 'not') {
      return !operand;
    }
  }

  if (expr.type === 'BinaryExpr') {
    return evaluateCondition(expr, ctx, entityContext);
  }

  if (expr.type === 'FunctionCall') {
    if (expr.name === 'now') {
      return new Date().toISOString();
    }
  }

  return undefined;
}

function toSnakeCase(str: string): string {
  return str
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '');
}
