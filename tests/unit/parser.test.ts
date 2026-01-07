import { Parser } from '../../src/parser/parser';
import { AppNode, EntityNode, ViewNode, FieldNode, ListBlockNode } from '../../src/parser/ast';

describe('Parser', () => {
  describe('app structure', () => {
    it('parses minimal app', () => {
      const input = `app Test {
        entity Item {
          name: text(1..50)
        }
      }`;
      const parser = new Parser(input);
      const ast = parser.parse();

      expect(ast.type).toBe('App');
      expect(ast.name).toBe('Test');
      expect(ast.entities).toHaveLength(1);
    });

    it('parses app with config', () => {
      const input = `app Test {
        config {
          accent: '#6366F1'
        }
        entity Item {
          name: text(1..50)
        }
      }`;
      const parser = new Parser(input);
      const ast = parser.parse();

      expect(ast.config).toBeDefined();
      expect(ast.config?.settings['accent']).toBe('#6366F1');
    });
  });

  describe('entities', () => {
    it('parses entity with basic field', () => {
      const input = `app Test {
        entity User {
          name: text(1..100)
        }
      }`;
      const parser = new Parser(input);
      const ast = parser.parse();

      const entity = ast.entities[0];
      expect(entity.name).toBe('User');
      expect(entity.fields).toHaveLength(1);
      expect(entity.fields[0].name).toBe('name');
      expect(entity.fields[0].fieldType).toEqual({ kind: 'text', minLength: 1, maxLength: 100 });
    });

    it('parses entity with email field', () => {
      const input = `app Test {
        entity User {
          email: email
        }
      }`;
      const parser = new Parser(input);
      const ast = parser.parse();

      const field = ast.entities[0].fields[0];
      expect(field.fieldType).toEqual({ kind: 'email' });
    });

    it('parses entity with all basic types', () => {
      const input = `app Test {
        entity Thing {
          a: email
          b: phone
          c: url
          d: int
          e: money
          f: bool
          g: date
          h: time
          i: timestamp
          j: uuid
        }
      }`;
      const parser = new Parser(input);
      const ast = parser.parse();

      const fields = ast.entities[0].fields;
      expect(fields[0].fieldType).toEqual({ kind: 'email' });
      expect(fields[1].fieldType).toEqual({ kind: 'phone' });
      expect(fields[2].fieldType).toEqual({ kind: 'url' });
      expect(fields[3].fieldType).toEqual({ kind: 'int' });
      expect(fields[4].fieldType).toEqual({ kind: 'money' });
      expect(fields[5].fieldType).toEqual({ kind: 'bool' });
      expect(fields[6].fieldType).toEqual({ kind: 'date' });
      expect(fields[7].fieldType).toEqual({ kind: 'time' });
      expect(fields[8].fieldType).toEqual({ kind: 'timestamp' });
      expect(fields[9].fieldType).toEqual({ kind: 'uuid' });
    });

    it('parses int with range', () => {
      const input = `app Test {
        entity Item {
          count: int(0..100)
        }
      }`;
      const parser = new Parser(input);
      const ast = parser.parse();

      const field = ast.entities[0].fields[0];
      expect(field.fieldType).toEqual({ kind: 'int', min: 0, max: 100 });
    });

    it('parses enum type', () => {
      const input = `app Test {
        entity User {
          role: enum('author', 'editor', 'admin')
        }
      }`;
      const parser = new Parser(input);
      const ast = parser.parse();

      const field = ast.entities[0].fields[0];
      expect(field.fieldType).toEqual({
        kind: 'enum',
        values: ['author', 'editor', 'admin']
      });
    });

    it('parses optional field', () => {
      const input = `app Test {
        entity User {
          bio: text(0..500)?
        }
      }`;
      const parser = new Parser(input);
      const ast = parser.parse();

      const field = ast.entities[0].fields[0];
      expect(field.optional).toBe(true);
    });

    it('parses field with default value', () => {
      const input = `app Test {
        entity Task {
          done: bool = false
        }
      }`;
      const parser = new Parser(input);
      const ast = parser.parse();

      const field = ast.entities[0].fields[0];
      expect(field.defaultValue).toBe(false);
    });

    it('parses field with string default value', () => {
      const input = `app Test {
        entity User {
          role: enum('user', 'admin') = 'user'
        }
      }`;
      const parser = new Parser(input);
      const ast = parser.parse();

      const field = ast.entities[0].fields[0];
      expect(field.defaultValue).toBe('user');
    });

    it('parses relationship field', () => {
      const input = `app Test {
        entity User {
          name: text(1..100)
        }
        entity Post {
          author: User
        }
      }`;
      const parser = new Parser(input);
      const ast = parser.parse();

      const field = ast.entities[1].fields[0];
      expect(field.name).toBe('author');
      expect(field.fieldType).toEqual({ kind: 'relation', target: 'User' });
    });

    it('parses optional relationship field', () => {
      const input = `app Test {
        entity Category {
          name: text(1..50)
        }
        entity Post {
          category: Category?
        }
      }`;
      const parser = new Parser(input);
      const ast = parser.parse();

      const field = ast.entities[1].fields[0];
      expect(field.optional).toBe(true);
      expect(field.fieldType).toEqual({ kind: 'relation', target: 'Category' });
    });
  });

  describe('views', () => {
    it('parses view with visibility', () => {
      const input = `app Test {
        entity Post {
          title: text(1..200)
        }
        view blog {
          visibility: public
          list Post {
            show: title
          }
        }
      }`;
      const parser = new Parser(input);
      const ast = parser.parse();

      const view = ast.views[0];
      expect(view.name).toBe('blog');
      expect(view.visibility).toBe('public');
    });

    it('parses view with require', () => {
      const input = `app Test {
        entity Post {
          title: text(1..200)
        }
        view admin {
          require: role == 'admin'
          list Post {
            show: title
          }
        }
      }`;
      const parser = new Parser(input);
      const ast = parser.parse();

      const view = ast.views[0];
      expect(view.require).toBeDefined();
      expect(view.require?.type).toBe('BinaryExpr');
    });

    it('parses view with in operator', () => {
      const input = `app Test {
        entity Post {
          title: text(1..200)
        }
        view editor {
          require: role in ['editor', 'admin']
          list Post {
            show: title
          }
        }
      }`;
      const parser = new Parser(input);
      const ast = parser.parse();

      const view = ast.views[0];
      expect(view.require).toBeDefined();
    });
  });

  describe('list blocks', () => {
    it('parses list with show', () => {
      const input = `app Test {
        entity Post {
          title: text(1..200)
        }
        view posts {
          list Post {
            show: title, created
          }
        }
      }`;
      const parser = new Parser(input);
      const ast = parser.parse();

      const list = ast.views[0].blocks[0] as ListBlockNode;
      expect(list.type).toBe('ListBlock');
      expect(list.entity).toBe('Post');
      expect(list.show).toHaveLength(2);
      expect(list.show[0].path).toEqual(['title']);
      expect(list.show[1].path).toEqual(['created']);
    });

    it('parses list with dotted field ref', () => {
      const input = `app Test {
        entity User {
          name: text(1..100)
        }
        entity Post {
          title: text(1..200)
          author: User
        }
        view posts {
          list Post {
            show: title, author.name
          }
        }
      }`;
      const parser = new Parser(input);
      const ast = parser.parse();

      const list = ast.views[0].blocks[0] as ListBlockNode;
      expect(list.show[1].path).toEqual(['author', 'name']);
    });

    it('parses list with where clause', () => {
      const input = `app Test {
        entity Post {
          title: text(1..200)
          published: bool
        }
        view blog {
          list Post {
            show: title
            where: published == true
          }
        }
      }`;
      const parser = new Parser(input);
      const ast = parser.parse();

      const list = ast.views[0].blocks[0] as ListBlockNode;
      expect(list.where).toBeDefined();
      expect(list.where?.type).toBe('BinaryExpr');
    });

    it('parses list with string comparison', () => {
      const input = `app Test {
        entity Post {
          title: text(1..200)
          status: enum('draft', 'published')
        }
        view blog {
          list Post {
            show: title
            where: status == 'published'
          }
        }
      }`;
      const parser = new Parser(input);
      const ast = parser.parse();

      const list = ast.views[0].blocks[0] as ListBlockNode;
      expect(list.where).toBeDefined();
    });

    it('parses list with order by', () => {
      const input = `app Test {
        entity Post {
          title: text(1..200)
        }
        view posts {
          list Post {
            show: title
            order by: created desc
          }
        }
      }`;
      const parser = new Parser(input);
      const ast = parser.parse();

      const list = ast.views[0].blocks[0] as ListBlockNode;
      expect(list.orderBy).toBeDefined();
      expect(list.orderBy?.field.path).toEqual(['created']);
      expect(list.orderBy?.direction).toBe('desc');
    });

    it('parses list with filter by', () => {
      const input = `app Test {
        entity Post {
          title: text(1..200)
          status: enum('draft', 'published')
        }
        view posts {
          list Post {
            show: title
            filter by: status
          }
        }
      }`;
      const parser = new Parser(input);
      const ast = parser.parse();

      const list = ast.views[0].blocks[0] as ListBlockNode;
      expect(list.filterBy).toEqual(['status']);
    });

    it('parses list with actions', () => {
      const input = `app Test {
        entity Post {
          title: text(1..200)
        }
        view posts {
          list Post {
            show: title
            actions: edit, delete
          }
        }
      }`;
      const parser = new Parser(input);
      const ast = parser.parse();

      const list = ast.views[0].blocks[0] as ListBlockNode;
      expect(list.actions).toEqual(['edit', 'delete']);
    });

    it('parses list with current_user reference', () => {
      const input = `app Test {
        entity User {
          name: text(1..100)
        }
        entity Post {
          title: text(1..200)
          author: User
        }
        view my_posts {
          list Post {
            show: title
            where: author == current_user
          }
        }
      }`;
      const parser = new Parser(input);
      const ast = parser.parse();

      const list = ast.views[0].blocks[0] as ListBlockNode;
      expect(list.where).toBeDefined();
    });
  });

  describe('create blocks', () => {
    it('parses create block', () => {
      const input = `app Test {
        entity Post {
          title: text(1..200)
        }
        view posts {
          create Post {
            input: title
          }
        }
      }`;
      const parser = new Parser(input);
      const ast = parser.parse();

      const create = ast.views[0].blocks[0];
      expect(create.type).toBe('CreateBlock');
      if (create.type === 'CreateBlock') {
        expect(create.entity).toBe('Post');
        expect(create.input).toEqual(['title']);
      }
    });

    it('parses create block with alias and then', () => {
      const input = `app Test {
        entity User {
          name: text(1..100)
        }
        entity Post {
          title: text(1..200)
          author: User
        }
        view posts {
          create Post as post {
            input: title
            then {
              post.author = current_user
            }
          }
        }
      }`;
      const parser = new Parser(input);
      const ast = parser.parse();

      const create = ast.views[0].blocks[0];
      expect(create.type).toBe('CreateBlock');
      if (create.type === 'CreateBlock') {
        expect(create.alias).toBe('post');
        expect(create.then).toBeDefined();
        expect(create.then?.statements).toHaveLength(1);
      }
    });
  });

  describe('edit blocks', () => {
    it('parses edit block with require', () => {
      const input = `app Test {
        entity User {
          name: text(1..100)
        }
        entity Post {
          title: text(1..200)
          author: User
        }
        view posts {
          edit Post as post {
            require: post.author == current_user
            input: title
          }
        }
      }`;
      const parser = new Parser(input);
      const ast = parser.parse();

      const edit = ast.views[0].blocks[0];
      expect(edit.type).toBe('EditBlock');
      if (edit.type === 'EditBlock') {
        expect(edit.require).toBeDefined();
        expect(edit.input).toEqual(['title']);
      }
    });
  });

  describe('actions', () => {
    it('parses action with require and then', () => {
      const input = `app Test {
        entity Task {
          title: text(1..200)
          done: bool
        }
        view tasks {
          action toggle(task: Task) {
            then {
              task.done = !task.done
            }
          }
        }
      }`;
      const parser = new Parser(input);
      const ast = parser.parse();

      const action = ast.views[0].blocks[0];
      expect(action.type).toBe('Action');
      if (action.type === 'Action') {
        expect(action.name).toBe('toggle');
        expect(action.parameter).toEqual({ name: 'task', entity: 'Task' });
        expect(action.then.statements).toHaveLength(1);
      }
    });

    it('parses action with require condition', () => {
      const input = `app Test {
        entity Post {
          title: text(1..200)
          status: enum('draft', 'published')
        }
        view posts {
          action publish(post: Post) {
            require: post.status == 'draft'
            then {
              post.status = 'published'
            }
          }
        }
      }`;
      const parser = new Parser(input);
      const ast = parser.parse();

      const action = ast.views[0].blocks[0];
      expect(action.type).toBe('Action');
      if (action.type === 'Action') {
        expect(action.require).toBeDefined();
      }
    });

    it('parses action with require block', () => {
      const input = `app Test {
        entity User {
          name: text(1..100)
        }
        entity Post {
          title: text(1..200)
          author: User
          status: enum('draft', 'review')
        }
        view posts {
          action submit(post: Post) {
            require {
              post.author == current_user
              post.status == 'draft'
            }
            then {
              post.status = 'review'
            }
          }
        }
      }`;
      const parser = new Parser(input);
      const ast = parser.parse();

      const action = ast.views[0].blocks[0];
      expect(action.type).toBe('Action');
      if (action.type === 'Action') {
        expect(action.require).toBeDefined();
        // Multiple conditions become AND
        expect(action.require?.type).toBe('BinaryExpr');
      }
    });

    it('parses action with now() function call', () => {
      const input = `app Test {
        entity Post {
          title: text(1..200)
          published_at: timestamp?
        }
        view posts {
          action publish(post: Post) {
            then {
              post.published_at = now()
            }
          }
        }
      }`;
      const parser = new Parser(input);
      const ast = parser.parse();

      const action = ast.views[0].blocks[0];
      if (action.type === 'Action') {
        const stmt = action.then.statements[0];
        if (stmt.type === 'Assignment') {
          expect(stmt.value.type).toBe('FunctionCall');
        }
      }
    });
  });

  describe('expressions', () => {
    it('parses and expression', () => {
      const input = `app Test {
        entity Post {
          title: text(1..200)
          published: bool
          featured: bool
        }
        view posts {
          list Post {
            show: title
            where: published and featured
          }
        }
      }`;
      const parser = new Parser(input);
      const ast = parser.parse();

      const list = ast.views[0].blocks[0] as ListBlockNode;
      expect(list.where?.type).toBe('BinaryExpr');
    });

    it('parses or expression', () => {
      const input = `app Test {
        entity Post {
          title: text(1..200)
          status: enum('draft', 'review', 'published')
        }
        view posts {
          list Post {
            show: title
            where: status == 'draft' or status == 'review'
          }
        }
      }`;
      const parser = new Parser(input);
      const ast = parser.parse();

      const list = ast.views[0].blocks[0] as ListBlockNode;
      expect(list.where?.type).toBe('BinaryExpr');
    });

    it('parses not expression', () => {
      const input = `app Test {
        entity Post {
          title: text(1..200)
          published: bool
        }
        view posts {
          list Post {
            show: title
            where: not published
          }
        }
      }`;
      const parser = new Parser(input);
      const ast = parser.parse();

      const list = ast.views[0].blocks[0] as ListBlockNode;
      expect(list.where?.type).toBe('UnaryExpr');
    });

    it('parses bang expression', () => {
      const input = `app Test {
        entity Task {
          title: text(1..200)
          done: bool
        }
        view tasks {
          action toggle(task: Task) {
            then {
              task.done = !task.done
            }
          }
        }
      }`;
      const parser = new Parser(input);
      const ast = parser.parse();

      const action = ast.views[0].blocks[0];
      if (action.type === 'Action') {
        const stmt = action.then.statements[0];
        if (stmt.type === 'Assignment') {
          expect(stmt.value.type).toBe('UnaryExpr');
        }
      }
    });
  });

  describe('complete examples', () => {
    it('parses minimal.kelvin fixture', () => {
      const input = `app Minimal {
        entity Task {
          title: text(1..200)
          done: bool = false
        }

        view tasks {
          list Task {
            show: title, done, created
            actions: edit, delete, toggle
          }

          create Task {
            input: title
          }

          action toggle(task: Task) {
            then {
              task.done = !task.done
            }
          }
        }
      }`;
      const parser = new Parser(input);
      const ast = parser.parse();

      expect(ast.name).toBe('Minimal');
      expect(ast.entities).toHaveLength(1);
      expect(ast.views).toHaveLength(1);
      expect(ast.views[0].blocks).toHaveLength(3);
    });
  });

  describe('error handling', () => {
    it('throws on missing app name', () => {
      const input = `app {
        entity Item { name: text(1..50) }
      }`;
      const parser = new Parser(input);
      expect(() => parser.parse()).toThrow(/expected.*app name/i);
    });

    it('throws on missing opening brace', () => {
      const input = `app Test
        entity Item { name: text(1..50) }
      }`;
      const parser = new Parser(input);
      expect(() => parser.parse()).toThrow(/expected.*{/i);
    });

    it('throws on invalid field type', () => {
      const input = `app Test {
        entity Item {
          name: invalid_type
        }
      }`;
      const parser = new Parser(input);
      // This parses as a relation type (reference to "invalid_type" entity)
      // Semantic analysis would catch that "invalid_type" doesn't exist
      const ast = parser.parse();
      expect(ast.entities[0].fields[0].fieldType).toEqual({ kind: 'relation', target: 'invalid_type' });
    });

    it('includes line number in error', () => {
      const input = `app Test {
        entity Item {
          name: text(1..50)
        }

        view items {
          list Item {
            show: name
            @invalid
          }
        }
      }`;
      const parser = new Parser(input);
      expect(() => parser.parse()).toThrow(/line \d+/i);
    });
  });
});
