import { Router, Request, Response } from 'express';
import { Database } from '../runtime/database';
import { QueryBuilder } from '../runtime/query-builder';
import { AppNode, ViewNode, ListBlockNode, CreateBlockNode, EditBlockNode } from '../parser/ast';
import { verifyToken, generateToken } from '../auth/jwt';
import { verifyPassword } from '../auth/password';
import {
  renderLayout,
  renderLoginPage,
  renderListPage,
  renderCreatePage,
  renderEditPage,
} from './templates';

export function createAdminRouter(db: Database, ast: AppNode, secret?: string): Router {
  const router = Router();
  const queryBuilder = new QueryBuilder(db, ast);
  const entities = new Map(ast.entities.map(e => [e.name, e]));

  // Session middleware for admin
  router.use((req, res, next) => {
    const token = req.cookies?.admin_token;
    if (token) {
      const payload = verifyToken(token, secret);
      if (payload) {
        req.ctx = {
          authenticated: true,
          current_user: payload.userId,
          role: payload.role,
        };
      }
    }
    next();
  });

  // Login page
  router.get('/login', (_req, res) => {
    res.send(renderLoginPage(ast));
  });

  // Login handler
  router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    const user = db.queryOne('SELECT * FROM users WHERE email = ?', [email]) as Record<string, unknown> | null;

    if (!user || !user.password_hash) {
      return res.send(renderLoginPage(ast, 'Invalid credentials'));
    }

    const valid = await verifyPassword(password, user.password_hash as string);
    if (!valid) {
      return res.send(renderLoginPage(ast, 'Invalid credentials'));
    }

    const token = generateToken({
      userId: user.id as string,
      email: user.email as string,
      role: user.role as string | undefined,
    }, secret);

    res.cookie('admin_token', token, { httpOnly: true });
    res.redirect('/admin');
  });

  // Logout
  router.get('/logout', (_req, res) => {
    res.clearCookie('admin_token');
    res.redirect('/admin/login');
  });

  // Auth guard for all other routes
  router.use((req, res, next) => {
    if (!req.ctx?.authenticated) {
      return res.redirect('/admin/login');
    }
    next();
  });

  // Dashboard - redirect to first view
  router.get('/', (_req, res) => {
    if (ast.views.length > 0) {
      res.redirect(`/admin/${ast.views[0].name}`);
    } else {
      res.send(renderLayout('Dashboard', '<p>No views configured</p>', ast));
    }
  });

  // Register routes for each view
  for (const view of ast.views) {
    registerViewRoutes(router, view, ast, queryBuilder, entities);
  }

  return router;
}

function registerViewRoutes(
  router: Router,
  view: ViewNode,
  ast: AppNode,
  queryBuilder: QueryBuilder,
  entities: Map<string, any>
): void {
  const viewPath = `/${view.name}`;

  // View index - redirect to first list block
  const firstList = view.blocks.find(b => b.type === 'ListBlock') as ListBlockNode | undefined;
  if (firstList) {
    router.get(viewPath, (req, res) => {
      if (!checkViewAccess(view, req.ctx!)) {
        return res.status(403).send('Forbidden');
      }
      res.redirect(`/admin${viewPath}/${toSnakeCase(firstList.entity)}`);
    });
  }

  for (const block of view.blocks) {
    if (block.type === 'ListBlock') {
      const entityPath = `/${toSnakeCase(block.entity)}`;
      const entity = entities.get(block.entity);

      // List page
      router.get(`${viewPath}${entityPath}`, async (req, res) => {
        try {
          // Check view access
          if (!checkViewAccess(view, req.ctx!)) {
            return res.status(403).send('Forbidden');
          }

          const page = parseInt(req.query.page as string) || 1;
          const result = await queryBuilder.list(
            block.entity,
            block,
            { current_user: req.ctx!.current_user, role: req.ctx!.role },
            { page, perPage: 20 }
          );

          res.send(renderListPage(view, block, entity, result.data, result.pagination, ast));
        } catch (err) {
          console.error('List error:', err);
          res.status(500).send('Error loading list');
        }
      });

      // Delete action
      if (block.actions?.includes('delete')) {
        router.post(`${viewPath}${entityPath}/:id/delete`, async (req, res) => {
          try {
            await queryBuilder.delete(block.entity, req.params.id);
            res.redirect(`/admin${viewPath}${entityPath}`);
          } catch (err) {
            console.error('Delete error:', err);
            res.redirect(`/admin${viewPath}${entityPath}`);
          }
        });
      }

      // Custom actions
      for (const actionName of block.actions || []) {
        if (actionName === 'edit' || actionName === 'delete') continue;

        router.post(`${viewPath}${entityPath}/:id/${actionName}`, async (req, res) => {
          try {
            // Find action definition in view
            const actionBlock = view.blocks.find(
              b => b.type === 'Action' && b.name === actionName
            ) as any;

            if (!actionBlock) {
              return res.redirect(`/admin${viewPath}${entityPath}`);
            }

            // Get entity
            const entityData = await queryBuilder.findById(block.entity, req.params.id);
            if (!entityData) {
              return res.redirect(`/admin${viewPath}${entityPath}`);
            }

            // Execute then block
            const updates: Record<string, unknown> = {};
            for (const stmt of actionBlock.then.statements) {
              if (stmt.type === 'Assignment') {
                const targetField = stmt.target.path[stmt.target.path.length - 1];
                const value = evaluateExpression(stmt.value, req.ctx!, { [actionBlock.parameter.name]: entityData });
                updates[targetField] = value;
              }
            }

            await queryBuilder.update(block.entity, req.params.id, updates);
            res.redirect(`/admin${viewPath}${entityPath}`);
          } catch (err) {
            console.error('Action error:', err);
            res.redirect(`/admin${viewPath}${entityPath}`);
          }
        });
      }
    }

    if (block.type === 'CreateBlock') {
      const entityPath = `/${toSnakeCase(block.entity)}`;
      const entity = entities.get(block.entity);

      // New form
      router.get(`${viewPath}${entityPath}/new`, (req, res) => {
        if (!checkViewAccess(view, req.ctx!)) {
          return res.status(403).send('Forbidden');
        }
        res.send(renderCreatePage(view, block, entity, ast));
      });

      // Create handler
      router.post(`${viewPath}${entityPath}`, async (req, res) => {
        try {
          if (!checkViewAccess(view, req.ctx!)) {
            return res.status(403).send('Forbidden');
          }

          const data: Record<string, unknown> = {};
          for (const field of block.input) {
            if (req.body[field] !== undefined && req.body[field] !== '') {
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

          await queryBuilder.create(block.entity, data);
          res.redirect(`/admin${viewPath}${entityPath}`);
        } catch (err) {
          console.error('Create error:', err);
          res.send(renderCreatePage(view, block, entity, ast, 'Error creating record'));
        }
      });
    }

    if (block.type === 'EditBlock') {
      const entityPath = `/${toSnakeCase(block.entity)}`;
      const entity = entities.get(block.entity);

      // Edit form
      router.get(`${viewPath}${entityPath}/:id/edit`, async (req, res) => {
        try {
          if (!checkViewAccess(view, req.ctx!)) {
            return res.status(403).send('Forbidden');
          }

          const entityData = await queryBuilder.findById(block.entity, req.params.id);
          if (!entityData) {
            return res.redirect(`/admin${viewPath}${entityPath}`);
          }

          res.send(renderEditPage(view, entity, entityData, block.input, ast));
        } catch (err) {
          console.error('Edit form error:', err);
          res.redirect(`/admin${viewPath}${entityPath}`);
        }
      });

      // Update handler
      router.post(`${viewPath}${entityPath}/:id`, async (req, res) => {
        try {
          if (!checkViewAccess(view, req.ctx!)) {
            return res.status(403).send('Forbidden');
          }

          const data: Record<string, unknown> = {};
          for (const field of block.input) {
            if (req.body[field] !== undefined) {
              data[field] = req.body[field] === '' ? null : req.body[field];
            }
          }

          await queryBuilder.update(block.entity, req.params.id, data);
          res.redirect(`/admin${viewPath}${entityPath}`);
        } catch (err) {
          console.error('Update error:', err);
          const entityData = await queryBuilder.findById(block.entity, req.params.id);
          res.send(renderEditPage(view, entity, entityData || {}, block.input, ast, 'Error updating record'));
        }
      });
    }
  }
}

function checkViewAccess(view: ViewNode, ctx: any): boolean {
  if (view.visibility === 'public') return true;

  if (!ctx.authenticated) return false;

  if (view.require) {
    return evaluateCondition(view.require, ctx, {});
  }

  return true;
}

function evaluateCondition(expr: any, ctx: any, entityContext: Record<string, unknown>): boolean {
  if (expr.type === 'BinaryExpr') {
    const left = evaluateExpression(expr.left, ctx, entityContext);
    const right = evaluateExpression(expr.right, ctx, entityContext);

    switch (expr.operator) {
      case '==': return left === right;
      case '!=': return left !== right;
      case 'and': return !!left && !!right;
      case 'or': return !!left || !!right;
      case 'in': return Array.isArray(right) && right.includes(left);
      default: return false;
    }
  }

  return !!evaluateExpression(expr, ctx, entityContext);
}

function evaluateExpression(expr: any, ctx: any, entityContext: Record<string, unknown>): unknown {
  if (expr.type === 'Literal') return expr.value;

  if (expr.type === 'FieldRef') {
    const path = expr.path as string[];
    if (path[0] === 'current_user') return ctx.current_user;
    if (path[0] === 'role') return ctx.role;

    if (entityContext[path[0]]) {
      let value: unknown = entityContext[path[0]];
      for (let i = 1; i < path.length; i++) {
        if (value && typeof value === 'object') {
          value = (value as Record<string, unknown>)[path[i]];
        }
      }
      return value;
    }
    return undefined;
  }

  if (expr.type === 'UnaryExpr') {
    const operand = evaluateExpression(expr.operand, ctx, entityContext);
    if (expr.operator === '!' || expr.operator === 'not') return !operand;
  }

  if (expr.type === 'FunctionCall' && expr.name === 'now') {
    return new Date().toISOString();
  }

  return undefined;
}

function toSnakeCase(str: string): string {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
}
