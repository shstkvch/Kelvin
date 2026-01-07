import { Database } from '../../src/runtime/database';
import { Migrator } from '../../src/schema/migrator';
import { Parser } from '../../src/parser/parser';

describe('Migrations', () => {
  let db: Database;

  beforeEach(async () => {
    db = new Database();
    await db.init(); // In-memory database
  });

  afterEach(() => {
    db.close();
  });

  it('creates tables on first run', async () => {
    const input = `app Test {
      entity User {
        email: email
        name: text(1..100)
      }
    }`;
    const parser = new Parser(input);
    const ast = parser.parse();
    const migrator = new Migrator(db, ast);

    const result = await migrator.migrate();

    expect(result.errors).toHaveLength(0);
    expect(result.created).toContain('users');
    expect(db.tableExists('users')).toBe(true);
  });

  it('creates multiple tables', async () => {
    const input = `app Test {
      entity User {
        email: email
      }
      entity Post {
        title: text(1..200)
        author: User
      }
    }`;
    const parser = new Parser(input);
    const ast = parser.parse();
    const migrator = new Migrator(db, ast);

    const result = await migrator.migrate();

    expect(db.tableExists('users')).toBe(true);
    expect(db.tableExists('posts')).toBe(true);
  });

  it('skips existing tables', async () => {
    const input = `app Test {
      entity User {
        email: email
      }
    }`;
    const parser = new Parser(input);
    const ast = parser.parse();
    const migrator = new Migrator(db, ast);

    // Run migrations twice
    await migrator.migrate();
    const result = await migrator.migrate();

    // Second run should not recreate the table
    expect(result.created).not.toContain('users');
  });

  it('creates indexes for foreign keys', async () => {
    const input = `app Test {
      entity User {
        email: email
      }
      entity Post {
        title: text(1..200)
        author: User
      }
    }`;
    const parser = new Parser(input);
    const ast = parser.parse();
    const migrator = new Migrator(db, ast);

    await migrator.migrate();

    const indexes = db.queryAll(
      "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='posts'"
    );
    const indexNames = indexes.map(i => i.name as string);
    expect(indexNames.some(n => n.includes('author_id'))).toBe(true);
  });

  it('dry run returns pending statements', async () => {
    const input = `app Test {
      entity User {
        email: email
      }
    }`;
    const parser = new Parser(input);
    const ast = parser.parse();
    const migrator = new Migrator(db, ast);

    const pending = await migrator.dryRun();

    expect(pending.length).toBeGreaterThan(0);
    expect(pending.some(s => s.includes('CREATE TABLE users'))).toBe(true);
  });
});

describe('QueryBuilder', () => {
  let db: Database;

  beforeEach(async () => {
    db = new Database();
    await db.init();
  });

  afterEach(() => {
    db.close();
  });

  describe('CRUD operations', () => {
    const blogApp = `app Blog {
      entity User {
        email: email
        name: text(1..100)
        role: enum('author', 'admin') = 'author'
      }
      entity Post {
        title: text(1..200)
        body: text
        author: User
        status: enum('draft', 'published') = 'draft'
      }
      view posts {
        list Post {
          show: title, author.name, status
          where: status == 'published'
          order by: created desc
        }
      }
    }`;

    beforeEach(async () => {
      const parser = new Parser(blogApp);
      const ast = parser.parse();
      const migrator = new Migrator(db, ast);
      await migrator.migrate();
    });

    it('creates entity', async () => {
      const { QueryBuilder } = await import('../../src/runtime/query-builder');
      const parser = new Parser(blogApp);
      const ast = parser.parse();
      const qb = new QueryBuilder(db, ast);

      const user = await qb.create('User', {
        email: 'test@example.com',
        name: 'Test User',
      });

      expect(user.id).toBeDefined();
      expect(user.email).toBe('test@example.com');
      expect(user.name).toBe('Test User');
      expect(user.created).toBeDefined();
    });

    it('finds entity by id', async () => {
      const { QueryBuilder } = await import('../../src/runtime/query-builder');
      const parser = new Parser(blogApp);
      const ast = parser.parse();
      const qb = new QueryBuilder(db, ast);

      const created = await qb.create('User', {
        email: 'test@example.com',
        name: 'Test User',
      });

      const found = await qb.findById('User', created.id as string);

      expect(found).not.toBeNull();
      expect(found?.email).toBe('test@example.com');
    });

    it('updates entity', async () => {
      const { QueryBuilder } = await import('../../src/runtime/query-builder');
      const parser = new Parser(blogApp);
      const ast = parser.parse();
      const qb = new QueryBuilder(db, ast);

      const user = await qb.create('User', {
        email: 'test@example.com',
        name: 'Test User',
      });

      const updated = await qb.update('User', user.id as string, {
        name: 'Updated Name',
      });

      expect(updated?.name).toBe('Updated Name');
      expect(updated?.email).toBe('test@example.com');
    });

    it('deletes entity', async () => {
      const { QueryBuilder } = await import('../../src/runtime/query-builder');
      const parser = new Parser(blogApp);
      const ast = parser.parse();
      const qb = new QueryBuilder(db, ast);

      const user = await qb.create('User', {
        email: 'test@example.com',
        name: 'Test User',
      });

      await qb.delete('User', user.id as string);

      const found = await qb.findById('User', user.id as string);
      expect(found).toBeNull();
    });

    it('lists entities with pagination', async () => {
      const { QueryBuilder } = await import('../../src/runtime/query-builder');
      const parser = new Parser(blogApp);
      const ast = parser.parse();
      const qb = new QueryBuilder(db, ast);

      // Create 25 users
      for (let i = 0; i < 25; i++) {
        await qb.create('User', {
          email: `user${i}@example.com`,
          name: `User ${i}`,
        });
      }

      const listBlock = ast.views[0].blocks[0];
      if (listBlock.type !== 'ListBlock') throw new Error('Expected ListBlock');

      // Create a simple list block for User
      const userListBlock = {
        ...listBlock,
        entity: 'User',
        where: undefined,
        show: [{ type: 'FieldRef' as const, path: ['name'], location: { line: 1, column: 1 } }],
      };

      const result = await qb.list('User', userListBlock, {}, { page: 1, perPage: 10 });

      expect(result.data).toHaveLength(10);
      expect(result.pagination.total).toBe(25);
      expect(result.pagination.totalPages).toBe(3);
    });

    it('creates post with relationship', async () => {
      const { QueryBuilder } = await import('../../src/runtime/query-builder');
      const parser = new Parser(blogApp);
      const ast = parser.parse();
      const qb = new QueryBuilder(db, ast);

      const user = await qb.create('User', {
        email: 'author@example.com',
        name: 'Author',
      });

      const post = await qb.create('Post', {
        title: 'Hello World',
        body: 'Content here',
        author: user.id,
      });

      expect(post.author_id).toBe(user.id);
    });
  });
});
