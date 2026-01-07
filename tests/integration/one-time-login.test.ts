import request from 'supertest';
import { Database } from '../../src/runtime/database';
import { Migrator } from '../../src/schema/migrator';
import { Parser } from '../../src/parser/parser';
import { createServer } from '../../src/api/server';
import { Express } from 'express';
import { createOTLToken } from '../../src/auth/one-time-login';

describe('One-Time Login Integration', () => {
  let db: Database;
  let app: Express;

  const blogApp = `app Blog {
    entity User {
      email: email
      name: text(1..100)
      role: enum('author', 'editor', 'admin') = 'author'
    }

    entity Post {
      title: text(1..200)
      body: text
    }

    view admin {
      require: role == 'admin'

      list User {
        show: name, email, role
      }
    }
  }`;

  beforeEach(async () => {
    db = new Database();
    await db.init();

    const parser = new Parser(blogApp);
    const ast = parser.parse();
    const migrator = new Migrator(db, ast);
    await migrator.migrate();

    ({ app } = createServer(ast, db, { jwtSecret: 'test-secret' }));
  });

  afterEach(() => {
    db.close();
  });

  describe('Admin one-time login', () => {
    it('authenticates user with valid OTL token', async () => {
      // Register a user first
      const registerRes = await request(app)
        .post('/auth/register')
        .send({
          email: 'admin@example.com',
          password: 'password123',
          name: 'Admin User',
          role: 'admin',
        });

      const userId = registerRes.body.data.id;

      // Create a one-time login token
      const token = createOTLToken(db, userId);

      // Use the token to login via admin panel
      const loginRes = await request(app)
        .get(`/admin/login?token=${token}`)
        .expect(302);

      // Should redirect to /admin
      expect(loginRes.headers.location).toBe('/admin');

      // Should set the admin_token cookie
      expect(loginRes.headers['set-cookie']).toBeDefined();
      expect(loginRes.headers['set-cookie'][0]).toContain('admin_token=');
    });

    it('rejects invalid OTL token', async () => {
      const res = await request(app)
        .get('/admin/login?token=invalid-token')
        .expect(200);

      // Should show login page with error
      expect(res.text).toContain('Token not found');
    });

    it('rejects already used OTL token', async () => {
      // Register a user first
      const registerRes = await request(app)
        .post('/auth/register')
        .send({
          email: 'admin@example.com',
          password: 'password123',
          name: 'Admin User',
          role: 'admin',
        });

      const userId = registerRes.body.data.id;

      // Create a one-time login token
      const token = createOTLToken(db, userId);

      // Use the token once
      await request(app)
        .get(`/admin/login?token=${token}`)
        .expect(302);

      // Try to use it again
      const secondRes = await request(app)
        .get(`/admin/login?token=${token}`)
        .expect(200);

      // Should show login page with error
      expect(secondRes.text).toContain('Token already used');
    });

    it('shows login page without token', async () => {
      const res = await request(app)
        .get('/admin/login')
        .expect(200);

      // Should show normal login page
      expect(res.text).toContain('Login');
      expect(res.text).not.toContain('Token');
    });
  });
});
