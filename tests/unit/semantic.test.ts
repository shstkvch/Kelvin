import { Parser } from '../../src/parser/parser';
import { SemanticAnalyzer } from '../../src/analyzer/semantic-analyzer';

describe('SemanticAnalyzer', () => {
  function analyze(source: string) {
    const parser = new Parser(source);
    const ast = parser.parse();
    const analyzer = new SemanticAnalyzer();
    return analyzer.analyze(ast);
  }

  describe('Entity validation', () => {
    it('detects duplicate entity names', () => {
      const result = analyze(`
        app Test {
          entity User {
            name: text
          }
          entity User {
            email: email
          }
        }
      `);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('E001');
      expect(result.errors[0].message).toContain('User');
    });

    it('detects duplicate field names within entity', () => {
      const result = analyze(`
        app Test {
          entity User {
            name: text
            name: text(1..100)
          }
        }
      `);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('E002');
      expect(result.errors[0].message).toContain('name');
    });

    it('validates relationship targets exist', () => {
      const result = analyze(`
        app Test {
          entity Post {
            title: text
            author: Admin
          }
        }
      `);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('E003');
      expect(result.errors[0].message).toContain('Admin');
    });

    it('allows valid relationship targets', () => {
      const result = analyze(`
        app Test {
          entity User {
            name: text
          }
          entity Post {
            title: text
            author: User
          }
        }
      `);

      expect(result.errors).toHaveLength(0);
    });

    it('validates enum defaults are valid values', () => {
      const result = analyze(`
        app Test {
          entity Post {
            status: enum('draft', 'published') = 'invalid'
          }
        }
      `);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('E006');
      expect(result.errors[0].message).toContain('invalid');
    });

    it('allows valid enum defaults', () => {
      const result = analyze(`
        app Test {
          entity Post {
            status: enum('draft', 'published') = 'draft'
          }
        }
      `);

      expect(result.errors).toHaveLength(0);
    });

    it('validates text constraint min <= max', () => {
      const result = analyze(`
        app Test {
          entity Post {
            title: text(100..10)
          }
        }
      `);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('E007');
    });

    it('validates int constraint min <= max', () => {
      const result = analyze(`
        app Test {
          entity Product {
            price: int(100..10)
          }
        }
      `);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('E007');
    });

    it('allows valid constraints', () => {
      const result = analyze(`
        app Test {
          entity Post {
            title: text(1..200)
            priority: int(1..10)
          }
        }
      `);

      expect(result.errors).toHaveLength(0);
    });
  });

  describe('View validation', () => {
    it('detects duplicate view names', () => {
      const result = analyze(`
        app Test {
          entity Post {
            title: text
          }
          view admin {
            list Post {
              show: title
            }
          }
          view admin {
            list Post {
              show: title
            }
          }
        }
      `);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('E001');
      expect(result.errors[0].message).toContain('admin');
    });

    it('validates show field references exist', () => {
      const result = analyze(`
        app Test {
          entity Post {
            title: text
          }
          view admin {
            list Post {
              show: title, nonexistent
            }
          }
        }
      `);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('E010');
      expect(result.errors[0].message).toContain('nonexistent');
    });

    it('validates nested field traversals', () => {
      const result = analyze(`
        app Test {
          entity User {
            name: text
          }
          entity Post {
            title: text
            author: User
          }
          view admin {
            list Post {
              show: title, author.nonexistent
            }
          }
        }
      `);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('E010');
      expect(result.errors[0].message).toContain('author.nonexistent');
    });

    it('allows valid nested field traversals', () => {
      const result = analyze(`
        app Test {
          entity User {
            name: text
          }
          entity Post {
            title: text
            author: User
          }
          view admin {
            list Post {
              show: title, author.name
            }
          }
        }
      `);

      expect(result.errors).toHaveLength(0);
    });

    it('validates action references are defined or built-in', () => {
      const result = analyze(`
        app Test {
          entity Post {
            title: text
          }
          view admin {
            list Post {
              show: title
              actions: edit, delete, pubish
            }
          }
        }
      `);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('E005');
      expect(result.errors[0].message).toContain('pubish');
    });

    it('allows built-in actions', () => {
      const result = analyze(`
        app Test {
          entity Post {
            title: text
          }
          view admin {
            list Post {
              show: title
              actions: edit, delete
            }
          }
        }
      `);

      expect(result.errors).toHaveLength(0);
    });

    it('allows custom actions when defined', () => {
      const result = analyze(`
        app Test {
          entity Post {
            title: text
            published: bool = false
          }
          view admin {
            list Post {
              show: title
              actions: edit, delete, publish
            }
            action publish(post: Post) {
              then {
                post.published = true
              }
            }
          }
        }
      `);

      expect(result.errors).toHaveLength(0);
    });

    it('validates where expressions reference valid fields', () => {
      const result = analyze(`
        app Test {
          entity Post {
            title: text
            published: bool = false
          }
          view blog {
            visibility: public
            list Post {
              show: title
              where: pubished
            }
          }
        }
      `);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('E010');
      expect(result.errors[0].message).toContain('pubished');
    });
  });

  describe('Authentication validation', () => {
    it('requires User entity for role checks', () => {
      const result = analyze(`
        app Test {
          entity Post {
            title: text
          }
          view admin {
            require: role == 'admin'
            list Post {
              show: title
            }
          }
        }
      `);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('E008');
    });

    it('requires User entity for current_user references', () => {
      const result = analyze(`
        app Test {
          entity Post {
            title: text
          }
          view author {
            list Post {
              show: title
              where: author == current_user
            }
          }
        }
      `);

      expect(result.errors.length).toBeGreaterThan(0);
      const authError = result.errors.find(e => e.code === 'E008');
      expect(authError).toBeDefined();
    });

    it('allows role checks when User entity exists', () => {
      const result = analyze(`
        app Test {
          entity User {
            email: email
            role: enum('user', 'admin') = 'user'
          }
          entity Post {
            title: text
          }
          view admin {
            require: role == 'admin'
            list Post {
              show: title
            }
          }
        }
      `);

      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Input validation', () => {
    it('validates input fields exist in entity', () => {
      const result = analyze(`
        app Test {
          entity Post {
            title: text
          }
          view admin {
            create Post {
              input: title, body
            }
          }
        }
      `);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('E004');
      expect(result.errors[0].message).toContain('body');
    });

    it('rejects implicit field as input', () => {
      const result = analyze(`
        app Test {
          entity Post {
            title: text
          }
          view admin {
            create Post {
              input: id, title
            }
          }
        }
      `);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('E009');
      expect(result.errors[0].message).toContain('id');
    });

    it('allows valid input fields', () => {
      const result = analyze(`
        app Test {
          entity Post {
            title: text
            body: text
          }
          view admin {
            create Post {
              input: title, body
            }
          }
        }
      `);

      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Action validation', () => {
    it('detects duplicate action names in view', () => {
      const result = analyze(`
        app Test {
          entity Post {
            title: text
            published: bool = false
          }
          view admin {
            list Post {
              show: title
              actions: publish
            }
            action publish(post: Post) {
              then {
                post.published = true
              }
            }
            action publish(post: Post) {
              then {
                post.published = false
              }
            }
          }
        }
      `);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('E001');
      expect(result.errors[0].message).toContain('publish');
    });

    it('validates action parameter entity exists', () => {
      const result = analyze(`
        app Test {
          entity Post {
            title: text
          }
          view admin {
            action publish(article: Article) {
              then {
                article.published = true
              }
            }
          }
        }
      `);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('E003');
      expect(result.errors[0].message).toContain('Article');
    });
  });

  describe('Valid apps pass without errors', () => {
    it('validates complete blog app', () => {
      const result = analyze(`
        app Blog {
          entity User {
            email: email
            name: text(1..100)
            role: enum('author', 'editor', 'admin') = 'author'
          }

          entity Post {
            title: text(1..200)
            body: text
            author: User
            status: enum('draft', 'published') = 'draft'
          }

          view blog {
            visibility: public
            list Post {
              show: title, author.name
              where: status == 'published'
            }
          }

          view author {
            list Post {
              show: title, status
              where: author == current_user
              actions: edit, delete, publish
            }

            create Post {
              input: title, body
            }

            action publish(post: Post) {
              then {
                post.status = 'published'
              }
            }
          }

          view admin {
            require: role == 'admin'
            list User {
              show: name, email, role
              actions: edit, delete
            }
          }
        }
      `);

      expect(result.errors).toHaveLength(0);
    });
  });
});
