import request from 'supertest';
import { Database } from '../../src/runtime/database';
import { Migrator } from '../../src/schema/migrator';
import { Parser } from '../../src/parser/parser';
import { createServer } from '../../src/api/server';
import { Express } from 'express';

describe('Authentication', () => {
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
      author: User
      status: enum('draft', 'review', 'published') = 'draft'
    }

    view author {
      list Post {
        show: title, status
        where: author == current_user
      }

      create Post as post {
        input: title, body

        then {
          post.author = current_user
          post.status = 'draft'
        }
      }
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

  describe('POST /auth/register', () => {
    it('registers new user', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.email).toBe('test@example.com');
      expect(res.body.data.name).toBe('Test User');
      expect(res.body.data).not.toHaveProperty('password_hash');
      expect(res.body.token).toBeDefined();
    });

    it('rejects duplicate email', async () => {
      await request(app)
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User',
        });

      const res = await request(app)
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password456',
          name: 'Another User',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('already registered');
    });

    it('rejects missing email', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({
          password: 'password123',
          name: 'Test User',
        });

      expect(res.status).toBe(400);
    });

    it('rejects missing password', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          name: 'Test User',
        });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      await request(app)
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User',
        });
    });

    it('logs in with valid credentials', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe('test@example.com');
      expect(res.body.data).not.toHaveProperty('password_hash');
      expect(res.body.token).toBeDefined();
    });

    it('rejects invalid password', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword',
        });

      expect(res.status).toBe(401);
    });

    it('rejects non-existent email', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123',
        });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /auth/me', () => {
    it('returns current user when authenticated', async () => {
      const registerRes = await request(app)
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User',
        });

      const token = registerRes.body.token;

      const res = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe('test@example.com');
    });

    it('returns 401 without token', async () => {
      const res = await request(app).get('/auth/me');

      expect(res.status).toBe(401);
    });

    it('returns 401 with invalid token', async () => {
      const res = await request(app)
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(res.status).toBe(401);
    });
  });

  describe('POST /auth/logout', () => {
    it('returns success', async () => {
      const res = await request(app).post('/auth/logout');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('Protected routes', () => {
    let token: string;
    let userId: string;

    beforeEach(async () => {
      const registerRes = await request(app)
        .post('/auth/register')
        .send({
          email: 'author@example.com',
          password: 'password123',
          name: 'Author',
        });

      token = registerRes.body.token;
      userId = registerRes.body.data.id;
    });

    it('allows authenticated access to protected view', async () => {
      const res = await request(app)
        .get('/api/author/post')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });

    it('can create post with current_user', async () => {
      const res = await request(app)
        .post('/api/author/post')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'My Post',
          body: 'Content',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.title).toBe('My Post');
      expect(res.body.data.author_id).toBe(userId);
      expect(res.body.data.status).toBe('draft');
    });
  });

  describe('Role-based access', () => {
    it('denies access to admin view for non-admin', async () => {
      const registerRes = await request(app)
        .post('/auth/register')
        .send({
          email: 'author@example.com',
          password: 'password123',
          name: 'Author',
          role: 'author',
        });

      const res = await request(app)
        .get('/api/admin/user')
        .set('Authorization', `Bearer ${registerRes.body.token}`);

      expect(res.status).toBe(403);
    });

    it('allows access to admin view for admin', async () => {
      // Register admin user
      const registerRes = await request(app)
        .post('/auth/register')
        .send({
          email: 'admin@example.com',
          password: 'password123',
          name: 'Admin',
          role: 'admin',
        });

      const res = await request(app)
        .get('/api/admin/user')
        .set('Authorization', `Bearer ${registerRes.body.token}`);

      expect(res.status).toBe(200);
    });
  });
});
