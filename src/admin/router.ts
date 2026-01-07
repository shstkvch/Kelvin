import { Router, Request, Response } from 'express';
import { Database } from '../runtime/database';
import { QueryBuilder } from '../runtime/query-builder';
import { AppNode, ViewNode, ListBlockNode, CreateBlockNode, EditBlockNode } from '../parser/ast';
import { verifyToken, generateToken } from '../auth/jwt';
import { verifyPassword } from '../auth/password';
import { AppContext } from '../api/server';
import {
  renderLayout,
  renderLoginPage,
  renderListPage,
  renderCreatePage,
  renderEditPage,
} from './templates';

export function createAdminRouter(db: Database, appCtx: AppContext, secret?: string): Router {
  const router = Router();

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
    res.send(renderLoginPage(appCtx.ast));
  });

  // Login handler
  router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    const user = db.queryOne('SELECT * FROM users WHERE email = ?', [email]) as Record<string, unknown> | null;

    if (!user || !user.password_hash) {
      return res.send(renderLoginPage(appCtx.ast, 'Invalid credentials'));
    }

    const valid = await verifyPassword(password, user.password_hash as string);
    if (!valid) {
      return res.send(renderLoginPage(appCtx.ast, 'Invalid credentials'));
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
    const ast = appCtx.ast;
    if (ast.views.length > 0) {
      res.redirect(`/admin/${ast.views[0].name}`);
    } else {
      res.send(renderLayout('Dashboard', '<p>No views configured</p>', ast));
    }
  });

  // Dynamic view routes - look up view from current AST on each request
  router.get('/:viewName', (req, res) => {
    const ast = appCtx.ast;
    const view = ast.views.find(v => v.name === req.params.viewName);
    if (!view) return res.status(404).send('View not found');

    if (!checkViewAccess(view, req.ctx!)) {
      return res.status(403).send('Forbidden');
    }

    const firstList = view.blocks.find(b => b.type === 'ListBlock') as ListBlockNode | undefined;
    if (firstList) {
      res.redirect(`/admin/${view.name}/${toSnakeCase(firstList.entity)}`);
    } else {
      res.send(renderLayout(view.name, '<p>No list blocks</p>', ast, view.name));
    }
  });

  // List page
  router.get('/:viewName/:entityName', async (req, res) => {
    try {
      const ast = appCtx.ast;
      const view = ast.views.find(v => v.name === req.params.viewName);
      if (!view) return res.status(404).send('View not found');

      if (!checkViewAccess(view, req.ctx!)) {
        return res.status(403).send('Forbidden');
      }

      const block = view.blocks.find(
        b => b.type === 'ListBlock' && toSnakeCase(b.entity) === req.params.entityName
      ) as ListBlockNode | undefined;
      if (!block) return res.status(404).send('List not found');

      const entity = ast.entities.find(e => e.name === block.entity);
      if (!entity) return res.status(404).send('Entity not found');

      const page = parseInt(req.query.page as string) || 1;
      const result = await appCtx.queryBuilder.list(
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

  // Create form
  router.get('/:viewName/:entityName/new', (req, res) => {
    const ast = appCtx.ast;
    const view = ast.views.find(v => v.name === req.params.viewName);
    if (!view) return res.status(404).send('View not found');

    if (!checkViewAccess(view, req.ctx!)) {
      return res.status(403).send('Forbidden');
    }

    const block = view.blocks.find(
      b => b.type === 'CreateBlock' && toSnakeCase(b.entity) === req.params.entityName
    ) as CreateBlockNode | undefined;
    if (!block) return res.status(404).send('Create block not found');

    const entity = ast.entities.find(e => e.name === block.entity);
    if (!entity) return res.status(404).send('Entity not found');

    res.send(renderCreatePage(view, block, entity, ast));
  });

  // Create handler
  router.post('/:viewName/:entityName', async (req, res) => {
    try {
      const ast = appCtx.ast;
      const view = ast.views.find(v => v.name === req.params.viewName);
      if (!view) return res.status(404).send('View not found');

      if (!checkViewAccess(view, req.ctx!)) {
        return res.status(403).send('Forbidden');
      }

      const block = view.blocks.find(
        b => b.type === 'CreateBlock' && toSnakeCase(b.entity) === req.params.entityName
      ) as CreateBlockNode | undefined;
      if (!block) return res.status(404).send('Create block not found');

      const entity = ast.entities.find(e => e.name === block.entity);
      if (!entity) return res.status(404).send('Entity not found');

      const data: Record<string, unknown> = {};
      for (const field of block.input) {
        if (req.body[field] !== undefined && req.body[field] !== '') {
          data[field] = req.body[field];
        }
      }

      if (block.then) {
        for (const stmt of block.then.statements) {
          if (stmt.type === 'Assignment') {
            const targetField = stmt.target.path[stmt.target.path.length - 1];
            const value = evaluateExpression(stmt.value, req.ctx!, {});
            data[targetField] = value;
          }
        }
      }

      await appCtx.queryBuilder.create(block.entity, data);
      res.redirect(`/admin/${view.name}/${req.params.entityName}`);
    } catch (err) {
      console.error('Create error:', err);
      res.status(500).send('Error creating record');
    }
  });

  // Edit form
  router.get('/:viewName/:entityName/:id/edit', async (req, res) => {
    try {
      const ast = appCtx.ast;
      const view = ast.views.find(v => v.name === req.params.viewName);
      if (!view) return res.status(404).send('View not found');

      if (!checkViewAccess(view, req.ctx!)) {
        return res.status(403).send('Forbidden');
      }

      const block = view.blocks.find(
        b => b.type === 'EditBlock' && toSnakeCase(b.entity) === req.params.entityName
      ) as EditBlockNode | undefined;
      if (!block) return res.status(404).send('Edit block not found');

      const entity = ast.entities.find(e => e.name === block.entity);
      if (!entity) return res.status(404).send('Entity not found');

      const entityData = await appCtx.queryBuilder.findById(block.entity, req.params.id);
      if (!entityData) return res.redirect(`/admin/${view.name}/${req.params.entityName}`);

      res.send(renderEditPage(view, entity, entityData, block.input, ast));
    } catch (err) {
      console.error('Edit form error:', err);
      res.status(500).send('Error loading edit form');
    }
  });

  // Update handler
  router.post('/:viewName/:entityName/:id', async (req, res) => {
    try {
      const ast = appCtx.ast;
      const view = ast.views.find(v => v.name === req.params.viewName);
      if (!view) return res.status(404).send('View not found');

      if (!checkViewAccess(view, req.ctx!)) {
        return res.status(403).send('Forbidden');
      }

      const block = view.blocks.find(
        b => b.type === 'EditBlock' && toSnakeCase(b.entity) === req.params.entityName
      ) as EditBlockNode | undefined;
      if (!block) return res.status(404).send('Edit block not found');

      const data: Record<string, unknown> = {};
      for (const field of block.input) {
        if (req.body[field] !== undefined) {
          data[field] = req.body[field] === '' ? null : req.body[field];
        }
      }

      await appCtx.queryBuilder.update(block.entity, req.params.id, data);
      res.redirect(`/admin/${view.name}/${req.params.entityName}`);
    } catch (err) {
      console.error('Update error:', err);
      res.status(500).send('Error updating record');
    }
  });

  // Delete handler
  router.post('/:viewName/:entityName/:id/delete', async (req, res) => {
    try {
      const ast = appCtx.ast;
      const view = ast.views.find(v => v.name === req.params.viewName);
      if (!view) return res.status(404).send('View not found');

      const block = view.blocks.find(
        b => b.type === 'ListBlock' && toSnakeCase(b.entity) === req.params.entityName
      ) as ListBlockNode | undefined;
      if (!block || !block.actions?.includes('delete')) {
        return res.status(404).send('Delete not allowed');
      }

      await appCtx.queryBuilder.delete(block.entity, req.params.id);
      res.redirect(`/admin/${view.name}/${req.params.entityName}`);
    } catch (err) {
      console.error('Delete error:', err);
      res.redirect(`/admin/${req.params.viewName}/${req.params.entityName}`);
    }
  });

  // Custom action handler
  router.post('/:viewName/:entityName/:id/:action', async (req, res) => {
    try {
      const ast = appCtx.ast;
      const view = ast.views.find(v => v.name === req.params.viewName);
      if (!view) return res.status(404).send('View not found');

      const actionName = req.params.action;
      if (actionName === 'delete') return res.status(400).send('Use delete endpoint');

      const listBlock = view.blocks.find(
        b => b.type === 'ListBlock' && toSnakeCase(b.entity) === req.params.entityName
      ) as ListBlockNode | undefined;
      if (!listBlock || !listBlock.actions?.includes(actionName)) {
        return res.status(404).send('Action not found');
      }

      const actionBlock = view.blocks.find(
        b => b.type === 'Action' && b.name === actionName
      ) as any;
      if (!actionBlock) return res.status(404).send('Action not defined');

      const entityData = await appCtx.queryBuilder.findById(listBlock.entity, req.params.id);
      if (!entityData) return res.redirect(`/admin/${view.name}/${req.params.entityName}`);

      const updates: Record<string, unknown> = {};
      for (const stmt of actionBlock.then.statements) {
        if (stmt.type === 'Assignment') {
          const targetField = stmt.target.path[stmt.target.path.length - 1];
          const value = evaluateExpression(stmt.value, req.ctx!, { [actionBlock.parameter.name]: entityData });
          updates[targetField] = value;
        }
      }

      await appCtx.queryBuilder.update(listBlock.entity, req.params.id, updates);
      res.redirect(`/admin/${view.name}/${req.params.entityName}`);
    } catch (err) {
      console.error('Action error:', err);
      res.redirect(`/admin/${req.params.viewName}/${req.params.entityName}`);
    }
  });

  return router;
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
