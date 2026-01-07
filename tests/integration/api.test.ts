import request from 'supertest';
import { Database } from '../../src/runtime/database';
import { Migrator } from '../../src/schema/migrator';
import { Parser } from '../../src/parser/parser';
import { createServer } from '../../src/api/server';
import { Express } from 'express';

describe('API', () => {
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

    view blog {
      visibility: public

      list Post {
        show: title, author.name, status
        where: status == 'published'
        order by: created desc
        filter by: status
      }
    }

    view author {
      list Post {
        show: title, status
        actions: edit, delete
      }

      create Post as post {
        input: title, body
      }

      edit Post as post {
        input: title, body
      }

      action submit(post: Post) {
        require: post.status == 'draft'

        then {
          post.status = 'review'
        }
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

    ({ app } = createServer(ast, db));
  });

  afterEach(() => {
    db.close();
  });

  describe('Public endpoints', () => {
    it('GET /api/blog/post returns empty list', async () => {
      const res = await request(app).get('/api/blog/post');

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
      expect(res.body.pagination).toBeDefined();
    });

    it('GET /api/blog/post returns published posts only', async () => {
      // Create user directly
      db.run(
        "INSERT INTO users (id, email, name, role, created, updated) VALUES (?, ?, ?, ?, ?, ?)",
        ['user1', 'author@test.com', 'Author', 'author', new Date().toISOString(), new Date().toISOString()]
      );

      // Create posts
      db.run(
        "INSERT INTO posts (id, title, body, author_id, status, created, updated) VALUES (?, ?, ?, ?, ?, ?, ?)",
        ['post1', 'Draft Post', 'Content', 'user1', 'draft', new Date().toISOString(), new Date().toISOString()]
      );
      db.run(
        "INSERT INTO posts (id, title, body, author_id, status, created, updated) VALUES (?, ?, ?, ?, ?, ?, ?)",
        ['post2', 'Published Post', 'Content', 'user1', 'published', new Date().toISOString(), new Date().toISOString()]
      );

      const res = await request(app).get('/api/blog/post');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].title).toBe('Published Post');
    });

    it('GET /api/blog/post/:id returns single post', async () => {
      db.run(
        "INSERT INTO users (id, email, name, role, created, updated) VALUES (?, ?, ?, ?, ?, ?)",
        ['user1', 'author@test.com', 'Author', 'author', new Date().toISOString(), new Date().toISOString()]
      );
      db.run(
        "INSERT INTO posts (id, title, body, author_id, status, created, updated) VALUES (?, ?, ?, ?, ?, ?, ?)",
        ['post1', 'Test Post', 'Content', 'user1', 'published', new Date().toISOString(), new Date().toISOString()]
      );

      const res = await request(app).get('/api/blog/post/post1');

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('Test Post');
    });

    it('GET /api/blog/post/:id returns 404 for non-existent', async () => {
      const res = await request(app).get('/api/blog/post/nonexistent');

      expect(res.status).toBe(404);
    });
  });

  describe('Authenticated endpoints', () => {
    it('GET /api/author/post returns 401 without auth', async () => {
      const res = await request(app).get('/api/author/post');

      expect(res.status).toBe(401);
    });

    it('POST /api/author/post returns 401 without auth', async () => {
      const res = await request(app)
        .post('/api/author/post')
        .send({ title: 'New Post', body: 'Content' });

      expect(res.status).toBe(401);
    });
  });

  describe('Pagination', () => {
    beforeEach(() => {
      // Create user
      db.run(
        "INSERT INTO users (id, email, name, role, created, updated) VALUES (?, ?, ?, ?, ?, ?)",
        ['user1', 'author@test.com', 'Author', 'author', new Date().toISOString(), new Date().toISOString()]
      );

      // Create 25 published posts
      for (let i = 0; i < 25; i++) {
        db.run(
          "INSERT INTO posts (id, title, body, author_id, status, created, updated) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [`post${i}`, `Post ${i}`, 'Content', 'user1', 'published', new Date().toISOString(), new Date().toISOString()]
        );
      }
    });

    it('returns paginated results', async () => {
      const res = await request(app).get('/api/blog/post?per_page=10');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(10);
      expect(res.body.pagination.total).toBe(25);
      expect(res.body.pagination.totalPages).toBe(3);
    });

    it('returns specific page', async () => {
      const res = await request(app).get('/api/blog/post?page=2&per_page=10');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(10);
      expect(res.body.pagination.page).toBe(2);
    });
  });

  describe('Filtering', () => {
    beforeEach(() => {
      db.run(
        "INSERT INTO users (id, email, name, role, created, updated) VALUES (?, ?, ?, ?, ?, ?)",
        ['user1', 'author@test.com', 'Author', 'author', new Date().toISOString(), new Date().toISOString()]
      );
      db.run(
        "INSERT INTO posts (id, title, body, author_id, status, created, updated) VALUES (?, ?, ?, ?, ?, ?, ?)",
        ['post1', 'Published 1', 'Content', 'user1', 'published', new Date().toISOString(), new Date().toISOString()]
      );
      db.run(
        "INSERT INTO posts (id, title, body, author_id, status, created, updated) VALUES (?, ?, ?, ?, ?, ?, ?)",
        ['post2', 'Published 2', 'Content', 'user1', 'published', new Date().toISOString(), new Date().toISOString()]
      );
    });

    it('filters by query parameter', async () => {
      const res = await request(app).get('/api/blog/post?status=published');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
    });
  });
});
