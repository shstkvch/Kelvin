import { SchemaGenerator } from '../../src/schema/generator';
import { Parser } from '../../src/parser/parser';

describe('SchemaGenerator', () => {
  function parseAndGenerate(input: string): string[] {
    const parser = new Parser(input);
    const ast = parser.parse();
    const generator = new SchemaGenerator(ast);
    return generator.generateSQL();
  }

  describe('basic tables', () => {
    it('generates table for simple entity', () => {
      const input = `app Test {
        entity Task {
          title: text(1..200)
        }
      }`;
      const sql = parseAndGenerate(input);

      expect(sql).toHaveLength(1);
      expect(sql[0]).toContain('CREATE TABLE');
      expect(sql[0]).toContain('tasks');
      expect(sql[0]).toContain('id TEXT PRIMARY KEY');
      expect(sql[0]).toContain('title VARCHAR(200) NOT NULL');
      expect(sql[0]).toContain('created TIMESTAMP');
      expect(sql[0]).toContain('updated TIMESTAMP');
    });

    it('uses snake_case for table names', () => {
      const input = `app Test {
        entity UserProfile {
          name: text(1..100)
        }
      }`;
      const sql = parseAndGenerate(input);

      expect(sql[0]).toContain('user_profiles');
    });

    it('pluralizes entity names for table names', () => {
      const input = `app Test {
        entity Category {
          name: text(1..50)
        }
      }`;
      const sql = parseAndGenerate(input);

      expect(sql[0]).toContain('categories');
    });
  });

  describe('field types', () => {
    it('generates text field with length', () => {
      const input = `app Test {
        entity Item {
          name: text(1..100)
        }
      }`;
      const sql = parseAndGenerate(input);

      expect(sql[0]).toContain('name VARCHAR(100) NOT NULL');
    });

    it('generates text field without length as TEXT', () => {
      const input = `app Test {
        entity Item {
          body: text
        }
      }`;
      const sql = parseAndGenerate(input);

      expect(sql[0]).toContain('body TEXT NOT NULL');
    });

    it('generates email field', () => {
      const input = `app Test {
        entity User {
          email: email
        }
      }`;
      const sql = parseAndGenerate(input);

      expect(sql[0]).toContain('email VARCHAR(254) NOT NULL');
    });

    it('generates phone field', () => {
      const input = `app Test {
        entity User {
          phone: phone
        }
      }`;
      const sql = parseAndGenerate(input);

      expect(sql[0]).toContain('phone VARCHAR(20) NOT NULL');
    });

    it('generates url field', () => {
      const input = `app Test {
        entity Item {
          link: url
        }
      }`;
      const sql = parseAndGenerate(input);

      expect(sql[0]).toContain('link VARCHAR(2048) NOT NULL');
    });

    it('generates int field', () => {
      const input = `app Test {
        entity Item {
          count: int
        }
      }`;
      const sql = parseAndGenerate(input);

      expect(sql[0]).toContain('count INTEGER NOT NULL');
    });

    it('generates money field', () => {
      const input = `app Test {
        entity Product {
          price: money
        }
      }`;
      const sql = parseAndGenerate(input);

      expect(sql[0]).toContain('price DECIMAL(19,4) NOT NULL');
    });

    it('generates bool field', () => {
      const input = `app Test {
        entity Task {
          done: bool
        }
      }`;
      const sql = parseAndGenerate(input);

      expect(sql[0]).toContain('done BOOLEAN NOT NULL');
    });

    it('generates date field', () => {
      const input = `app Test {
        entity Event {
          date: date
        }
      }`;
      const sql = parseAndGenerate(input);

      expect(sql[0]).toContain('date DATE NOT NULL');
    });

    it('generates time field', () => {
      const input = `app Test {
        entity Event {
          start_time: time
        }
      }`;
      const sql = parseAndGenerate(input);

      expect(sql[0]).toContain('start_time TIME NOT NULL');
    });

    it('generates timestamp field', () => {
      const input = `app Test {
        entity Post {
          published_at: timestamp
        }
      }`;
      const sql = parseAndGenerate(input);

      expect(sql[0]).toContain('published_at TIMESTAMP NOT NULL');
    });

    it('generates uuid field', () => {
      const input = `app Test {
        entity Token {
          value: uuid
        }
      }`;
      const sql = parseAndGenerate(input);

      expect(sql[0]).toContain('value TEXT NOT NULL');
    });

    it('generates enum field as TEXT', () => {
      const input = `app Test {
        entity User {
          role: enum('user', 'admin')
        }
      }`;
      const sql = parseAndGenerate(input);

      // SQLite doesn't have enum type, use TEXT
      expect(sql[0]).toContain('role TEXT NOT NULL');
    });
  });

  describe('optional fields', () => {
    it('generates nullable field', () => {
      const input = `app Test {
        entity User {
          bio: text(0..500)?
        }
      }`;
      const sql = parseAndGenerate(input);

      // Nullable fields don't have NOT NULL
      expect(sql[0]).toContain('bio VARCHAR(500)');
      expect(sql[0]).not.toMatch(/bio VARCHAR\(500\) NOT NULL/);
    });
  });

  describe('default values', () => {
    it('generates boolean default', () => {
      const input = `app Test {
        entity Task {
          done: bool = false
        }
      }`;
      const sql = parseAndGenerate(input);

      expect(sql[0]).toContain('done BOOLEAN NOT NULL DEFAULT 0');
    });

    it('generates string default', () => {
      const input = `app Test {
        entity User {
          role: enum('user', 'admin') = 'user'
        }
      }`;
      const sql = parseAndGenerate(input);

      expect(sql[0]).toContain("role TEXT NOT NULL DEFAULT 'user'");
    });

    it('generates integer default', () => {
      const input = `app Test {
        entity Item {
          count: int = 0
        }
      }`;
      const sql = parseAndGenerate(input);

      expect(sql[0]).toContain('count INTEGER NOT NULL DEFAULT 0');
    });
  });

  describe('relationships', () => {
    it('generates foreign key for relationship', () => {
      const input = `app Test {
        entity User {
          name: text(1..100)
        }
        entity Post {
          author: User
        }
      }`;
      const sql = parseAndGenerate(input);

      const postTable = sql.find(s => s.includes('CREATE TABLE posts'));
      expect(postTable).toContain('author_id TEXT NOT NULL');
      expect(postTable).toContain('FOREIGN KEY (author_id) REFERENCES users(id)');
    });

    it('generates nullable foreign key for optional relationship', () => {
      const input = `app Test {
        entity Category {
          name: text(1..50)
        }
        entity Post {
          category: Category?
        }
      }`;
      const sql = parseAndGenerate(input);

      const postTable = sql.find(s => s.includes('CREATE TABLE posts'));
      expect(postTable).toContain('category_id TEXT');
      expect(postTable).not.toMatch(/category_id TEXT NOT NULL/);
    });

    it('generates index for foreign key', () => {
      const input = `app Test {
        entity User {
          name: text(1..100)
        }
        entity Post {
          author: User
        }
      }`;
      const sql = parseAndGenerate(input);

      expect(sql.some(s => s.includes('CREATE INDEX') && s.includes('author_id'))).toBe(true);
    });
  });

  describe('User entity special handling', () => {
    it('adds password_hash field to User entity', () => {
      const input = `app Test {
        entity User {
          email: email
          name: text(1..100)
        }
      }`;
      const sql = parseAndGenerate(input);

      expect(sql[0]).toContain('password_hash TEXT');
    });
  });

  describe('complete example', () => {
    it('generates schema for blog entities', () => {
      const input = `app Blog {
        entity User {
          email: email
          name: text(1..100)
          role: enum('author', 'editor', 'admin') = 'author'
        }

        entity Category {
          name: text(1..50)
          slug: text(1..50)
        }

        entity Post {
          title: text(1..200)
          slug: text(1..200)
          body: text(1..100000)
          author: User
          category: Category?
          status: enum('draft', 'review', 'published') = 'draft'
          published_at: timestamp?
        }

        view blog {
          list Post { show: title }
        }
      }`;
      const sql = parseAndGenerate(input);

      // Should generate 3 tables
      expect(sql.filter(s => s.includes('CREATE TABLE'))).toHaveLength(3);

      // Check users table
      const usersTable = sql.find(s => s.includes('CREATE TABLE users'));
      expect(usersTable).toContain('email VARCHAR(254) NOT NULL');
      expect(usersTable).toContain('name VARCHAR(100) NOT NULL');
      expect(usersTable).toContain("role TEXT NOT NULL DEFAULT 'author'");
      expect(usersTable).toContain('password_hash TEXT');

      // Check posts table
      const postsTable = sql.find(s => s.includes('CREATE TABLE posts'));
      expect(postsTable).toContain('title VARCHAR(200) NOT NULL');
      expect(postsTable).toContain('author_id TEXT NOT NULL');
      expect(postsTable).toContain('category_id TEXT');
      expect(postsTable).toContain("status TEXT NOT NULL DEFAULT 'draft'");
    });
  });
});
