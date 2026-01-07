import { Router, Request, Response } from 'express';
import { hashPassword, verifyPassword } from '../auth/password';
import { generateToken } from '../auth/jwt';
import { Database } from '../runtime/database';
import { QueryBuilder } from '../runtime/query-builder';
import { AppNode } from '../parser/ast';
import { v4 as uuidv4 } from 'uuid';

export function createAuthRouter(db: Database, ast: AppNode, secret?: string): Router {
  const router = Router();
  const queryBuilder = new QueryBuilder(db, ast);

  // Check if User entity exists
  const userEntity = ast.entities.find(e => e.name === 'User');
  if (!userEntity) {
    return router; // No auth routes if no User entity
  }

  // POST /auth/register
  router.post('/register', async (req: Request, res: Response) => {
    try {
      const { email, password, name, ...rest } = req.body;

      // Validate required fields
      if (!email || !password) {
        return res.status(400).json({
          error: { message: 'Email and password are required', type: 'validation_error' }
        });
      }

      // Check if user already exists
      const existing = db.queryOne(
        'SELECT id FROM users WHERE email = ?',
        [email]
      );
      if (existing) {
        return res.status(400).json({
          error: { message: 'Email already registered', type: 'validation_error' }
        });
      }

      // Hash password
      const passwordHash = await hashPassword(password);

      // Create user
      const id = uuidv4();
      const now = new Date().toISOString();

      // Build insert data
      const columns = ['id', 'email', 'password_hash', 'created', 'updated'];
      const values: unknown[] = [id, email, passwordHash, now, now];

      if (name) {
        columns.push('name');
        values.push(name);
      }

      // Add other fields from request body
      for (const [key, value] of Object.entries(rest)) {
        const field = userEntity.fields.find(f => f.name === key);
        if (field) {
          columns.push(key);
          values.push(value);
        }
      }

      const placeholders = columns.map(() => '?').join(', ');
      db.run(`INSERT INTO users (${columns.join(', ')}) VALUES (${placeholders})`, values);

      // Get created user (without password)
      const user = db.queryOne('SELECT * FROM users WHERE id = ?', [id]);
      if (user) {
        delete (user as Record<string, unknown>).password_hash;
      }

      // Generate token
      const token = generateToken({
        userId: id,
        email,
        role: (user as Record<string, unknown>)?.role as string,
      }, secret);

      res.status(201).json({
        data: user,
        token,
      });
    } catch (err) {
      console.error('Register error:', err);
      res.status(500).json({
        error: { message: 'Registration failed', type: 'internal_error' }
      });
    }
  });

  // POST /auth/login
  router.post('/login', async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          error: { message: 'Email and password are required', type: 'validation_error' }
        });
      }

      // Find user
      const user = db.queryOne(
        'SELECT * FROM users WHERE email = ?',
        [email]
      ) as Record<string, unknown> | null;

      if (!user) {
        return res.status(401).json({
          error: { message: 'Invalid credentials', type: 'authentication_error' }
        });
      }

      // Verify password
      const passwordHash = user.password_hash as string;
      if (!passwordHash) {
        return res.status(401).json({
          error: { message: 'Invalid credentials', type: 'authentication_error' }
        });
      }

      const valid = await verifyPassword(password, passwordHash);
      if (!valid) {
        return res.status(401).json({
          error: { message: 'Invalid credentials', type: 'authentication_error' }
        });
      }

      // Generate token
      const token = generateToken({
        userId: user.id as string,
        email: user.email as string,
        role: user.role as string | undefined,
      }, secret);

      // Remove password from response
      delete user.password_hash;

      res.json({
        data: user,
        token,
      });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({
        error: { message: 'Login failed', type: 'internal_error' }
      });
    }
  });

  // POST /auth/logout
  router.post('/logout', (_req: Request, res: Response) => {
    // JWT tokens are stateless, so logout is a no-op on the server
    // Client should discard the token
    res.json({ success: true });
  });

  // GET /auth/me
  router.get('/me', (req: Request, res: Response) => {
    if (!req.ctx?.authenticated || !req.ctx.current_user) {
      return res.status(401).json({
        error: { message: 'Not authenticated', type: 'authentication_error' }
      });
    }

    const user = db.queryOne(
      'SELECT * FROM users WHERE id = ?',
      [req.ctx.current_user]
    ) as Record<string, unknown> | null;

    if (!user) {
      return res.status(404).json({
        error: { message: 'User not found', type: 'not_found' }
      });
    }

    delete user.password_hash;

    res.json({ data: user });
  });

  return router;
}
