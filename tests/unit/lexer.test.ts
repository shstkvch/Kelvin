import { Lexer } from '../../src/parser/lexer';
import { TokenType } from '../../src/parser/tokens';

describe('Lexer', () => {
  describe('basic tokens', () => {
    it('tokenizes empty input', () => {
      const lexer = new Lexer('');
      const tokens = lexer.tokenize();
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.EOF);
    });

    it('tokenizes whitespace only', () => {
      const lexer = new Lexer('   \n\t  ');
      const tokens = lexer.tokenize();
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.EOF);
    });

    it('skips comments', () => {
      const lexer = new Lexer('-- this is a comment\napp');
      const tokens = lexer.tokenize();
      expect(tokens).toHaveLength(2);
      expect(tokens[0].type).toBe(TokenType.APP);
    });
  });

  describe('keywords', () => {
    it('tokenizes app keyword', () => {
      const lexer = new Lexer('app');
      const tokens = lexer.tokenize();
      expect(tokens[0].type).toBe(TokenType.APP);
      expect(tokens[0].value).toBe('app');
    });

    it('tokenizes entity keyword', () => {
      const lexer = new Lexer('entity');
      const tokens = lexer.tokenize();
      expect(tokens[0].type).toBe(TokenType.ENTITY);
    });

    it('tokenizes view keyword', () => {
      const lexer = new Lexer('view');
      const tokens = lexer.tokenize();
      expect(tokens[0].type).toBe(TokenType.VIEW);
    });

    it('tokenizes all keywords', () => {
      const keywords = [
        'app', 'config', 'entity', 'view', 'list', 'detail', 'create', 'edit',
        'action', 'trigger', 'require', 'visibility', 'show', 'where', 'order',
        'filter', 'by', 'actions', 'input', 'then', 'validate', 'as', 'via',
        'and', 'or', 'not', 'in', 'asc', 'desc', 'public', 'authenticated', 'now'
      ];
      const lexer = new Lexer(keywords.join(' '));
      const tokens = lexer.tokenize();
      expect(tokens).toHaveLength(keywords.length + 1); // +1 for EOF
    });
  });

  describe('type keywords', () => {
    it('tokenizes text type', () => {
      const lexer = new Lexer('text');
      const tokens = lexer.tokenize();
      expect(tokens[0].type).toBe(TokenType.TEXT);
    });

    it('tokenizes all type keywords', () => {
      const types = ['text', 'email', 'phone', 'url', 'int', 'money', 'bool', 'date', 'time', 'timestamp', 'enum', 'uuid'];
      const lexer = new Lexer(types.join(' '));
      const tokens = lexer.tokenize();
      expect(tokens).toHaveLength(types.length + 1);
    });
  });

  describe('identifiers', () => {
    it('tokenizes PascalCase identifier', () => {
      const lexer = new Lexer('User');
      const tokens = lexer.tokenize();
      expect(tokens[0].type).toBe(TokenType.IDENTIFIER);
      expect(tokens[0].value).toBe('User');
    });

    it('tokenizes snake_case identifier', () => {
      const lexer = new Lexer('user_name');
      const tokens = lexer.tokenize();
      expect(tokens[0].type).toBe(TokenType.IDENTIFIER);
      expect(tokens[0].value).toBe('user_name');
    });

    it('tokenizes identifier with numbers', () => {
      const lexer = new Lexer('user123');
      const tokens = lexer.tokenize();
      expect(tokens[0].type).toBe(TokenType.IDENTIFIER);
      expect(tokens[0].value).toBe('user123');
    });

    it('does not tokenize identifier starting with number', () => {
      const lexer = new Lexer('123user');
      const tokens = lexer.tokenize();
      expect(tokens[0].type).toBe(TokenType.NUMBER);
      expect(tokens[1].type).toBe(TokenType.IDENTIFIER);
    });
  });

  describe('literals', () => {
    it('tokenizes single quoted string', () => {
      const lexer = new Lexer("'hello world'");
      const tokens = lexer.tokenize();
      expect(tokens[0].type).toBe(TokenType.STRING);
      expect(tokens[0].value).toBe('hello world');
    });

    it('tokenizes string with escaped quote', () => {
      const lexer = new Lexer("'it\\'s'");
      const tokens = lexer.tokenize();
      expect(tokens[0].type).toBe(TokenType.STRING);
      expect(tokens[0].value).toBe("it's");
    });

    it('tokenizes integer', () => {
      const lexer = new Lexer('42');
      const tokens = lexer.tokenize();
      expect(tokens[0].type).toBe(TokenType.NUMBER);
      expect(tokens[0].value).toBe('42');
    });

    it('tokenizes negative integer', () => {
      const lexer = new Lexer('-42');
      const tokens = lexer.tokenize();
      // Negative is parsed as two tokens for simplicity
      expect(tokens[0].type).toBe(TokenType.NUMBER);
      expect(tokens[0].value).toBe('-42');
    });

    it('tokenizes true', () => {
      const lexer = new Lexer('true');
      const tokens = lexer.tokenize();
      expect(tokens[0].type).toBe(TokenType.TRUE);
    });

    it('tokenizes false', () => {
      const lexer = new Lexer('false');
      const tokens = lexer.tokenize();
      expect(tokens[0].type).toBe(TokenType.FALSE);
    });
  });

  describe('operators', () => {
    it('tokenizes ==', () => {
      const lexer = new Lexer('==');
      const tokens = lexer.tokenize();
      expect(tokens[0].type).toBe(TokenType.EQ);
    });

    it('tokenizes !=', () => {
      const lexer = new Lexer('!=');
      const tokens = lexer.tokenize();
      expect(tokens[0].type).toBe(TokenType.NE);
    });

    it('tokenizes >', () => {
      const lexer = new Lexer('>');
      const tokens = lexer.tokenize();
      expect(tokens[0].type).toBe(TokenType.GT);
    });

    it('tokenizes >=', () => {
      const lexer = new Lexer('>=');
      const tokens = lexer.tokenize();
      expect(tokens[0].type).toBe(TokenType.GE);
    });

    it('tokenizes <', () => {
      const lexer = new Lexer('<');
      const tokens = lexer.tokenize();
      expect(tokens[0].type).toBe(TokenType.LT);
    });

    it('tokenizes <=', () => {
      const lexer = new Lexer('<=');
      const tokens = lexer.tokenize();
      expect(tokens[0].type).toBe(TokenType.LE);
    });

    it('tokenizes = (assignment)', () => {
      const lexer = new Lexer('=');
      const tokens = lexer.tokenize();
      expect(tokens[0].type).toBe(TokenType.ASSIGN);
    });

    it('tokenizes !', () => {
      const lexer = new Lexer('!');
      const tokens = lexer.tokenize();
      expect(tokens[0].type).toBe(TokenType.BANG);
    });

    it('tokenizes .', () => {
      const lexer = new Lexer('.');
      const tokens = lexer.tokenize();
      expect(tokens[0].type).toBe(TokenType.DOT);
    });

    it('tokenizes ..', () => {
      const lexer = new Lexer('..');
      const tokens = lexer.tokenize();
      expect(tokens[0].type).toBe(TokenType.DOTDOT);
    });
  });

  describe('delimiters', () => {
    it('tokenizes braces', () => {
      const lexer = new Lexer('{}');
      const tokens = lexer.tokenize();
      expect(tokens[0].type).toBe(TokenType.LBRACE);
      expect(tokens[1].type).toBe(TokenType.RBRACE);
    });

    it('tokenizes parentheses', () => {
      const lexer = new Lexer('()');
      const tokens = lexer.tokenize();
      expect(tokens[0].type).toBe(TokenType.LPAREN);
      expect(tokens[1].type).toBe(TokenType.RPAREN);
    });

    it('tokenizes brackets', () => {
      const lexer = new Lexer('[]');
      const tokens = lexer.tokenize();
      expect(tokens[0].type).toBe(TokenType.LBRACKET);
      expect(tokens[1].type).toBe(TokenType.RBRACKET);
    });

    it('tokenizes colon', () => {
      const lexer = new Lexer(':');
      const tokens = lexer.tokenize();
      expect(tokens[0].type).toBe(TokenType.COLON);
    });

    it('tokenizes comma', () => {
      const lexer = new Lexer(',');
      const tokens = lexer.tokenize();
      expect(tokens[0].type).toBe(TokenType.COMMA);
    });

    it('tokenizes question mark', () => {
      const lexer = new Lexer('?');
      const tokens = lexer.tokenize();
      expect(tokens[0].type).toBe(TokenType.QUESTION);
    });
  });

  describe('line and column tracking', () => {
    it('tracks line numbers', () => {
      const lexer = new Lexer('app\nentity');
      const tokens = lexer.tokenize();
      expect(tokens[0].line).toBe(1);
      expect(tokens[1].line).toBe(2);
    });

    it('tracks column numbers', () => {
      const lexer = new Lexer('app entity');
      const tokens = lexer.tokenize();
      expect(tokens[0].column).toBe(1);
      expect(tokens[1].column).toBe(5);
    });

    it('resets column on newline', () => {
      const lexer = new Lexer('app\n  entity');
      const tokens = lexer.tokenize();
      expect(tokens[1].column).toBe(3);
    });
  });

  describe('complex examples', () => {
    it('tokenizes entity definition', () => {
      const input = `entity User {
  email: email
  name: text(1..100)
}`;
      const lexer = new Lexer(input);
      const tokens = lexer.tokenize();

      expect(tokens[0]).toMatchObject({ type: TokenType.ENTITY, value: 'entity' });
      expect(tokens[1]).toMatchObject({ type: TokenType.IDENTIFIER, value: 'User' });
      expect(tokens[2]).toMatchObject({ type: TokenType.LBRACE });
      // Note: 'email' is a keyword, so it's tokenized as EMAIL even when used as field name
      // The parser handles context (field name vs type)
      expect(tokens[3]).toMatchObject({ type: TokenType.EMAIL, value: 'email' });
      expect(tokens[4]).toMatchObject({ type: TokenType.COLON });
      expect(tokens[5]).toMatchObject({ type: TokenType.EMAIL });
      expect(tokens[6]).toMatchObject({ type: TokenType.IDENTIFIER, value: 'name' });
      expect(tokens[7]).toMatchObject({ type: TokenType.COLON });
      expect(tokens[8]).toMatchObject({ type: TokenType.TEXT });
      expect(tokens[9]).toMatchObject({ type: TokenType.LPAREN });
      expect(tokens[10]).toMatchObject({ type: TokenType.NUMBER, value: '1' });
      expect(tokens[11]).toMatchObject({ type: TokenType.DOTDOT });
      expect(tokens[12]).toMatchObject({ type: TokenType.NUMBER, value: '100' });
      expect(tokens[13]).toMatchObject({ type: TokenType.RPAREN });
      expect(tokens[14]).toMatchObject({ type: TokenType.RBRACE });
    });

    it('tokenizes view with where clause', () => {
      const input = `view blog {
  list Post {
    where: status == 'published'
  }
}`;
      const lexer = new Lexer(input);
      const tokens = lexer.tokenize();

      const tokenTypes = tokens.map(t => t.type);
      expect(tokenTypes).toContain(TokenType.VIEW);
      expect(tokenTypes).toContain(TokenType.LIST);
      expect(tokenTypes).toContain(TokenType.WHERE);
      expect(tokenTypes).toContain(TokenType.EQ);
      expect(tokenTypes).toContain(TokenType.STRING);
    });

    it('tokenizes enum type', () => {
      const input = "role: enum('author', 'editor', 'admin')";
      const lexer = new Lexer(input);
      const tokens = lexer.tokenize();

      expect(tokens[0]).toMatchObject({ type: TokenType.IDENTIFIER, value: 'role' });
      expect(tokens[1]).toMatchObject({ type: TokenType.COLON });
      expect(tokens[2]).toMatchObject({ type: TokenType.ENUM });
      expect(tokens[3]).toMatchObject({ type: TokenType.LPAREN });
      expect(tokens[4]).toMatchObject({ type: TokenType.STRING, value: 'author' });
      expect(tokens[5]).toMatchObject({ type: TokenType.COMMA });
      expect(tokens[6]).toMatchObject({ type: TokenType.STRING, value: 'editor' });
    });

    it('tokenizes field with default value', () => {
      const input = "done: bool = false";
      const lexer = new Lexer(input);
      const tokens = lexer.tokenize();

      expect(tokens[0]).toMatchObject({ type: TokenType.IDENTIFIER, value: 'done' });
      expect(tokens[1]).toMatchObject({ type: TokenType.COLON });
      expect(tokens[2]).toMatchObject({ type: TokenType.BOOL });
      expect(tokens[3]).toMatchObject({ type: TokenType.ASSIGN });
      expect(tokens[4]).toMatchObject({ type: TokenType.FALSE });
    });

    it('tokenizes optional field', () => {
      const input = "bio: text(0..500)?";
      const lexer = new Lexer(input);
      const tokens = lexer.tokenize();

      expect(tokens[tokens.length - 2]).toMatchObject({ type: TokenType.QUESTION });
    });

    it('tokenizes relationship field', () => {
      const input = "author: User";
      const lexer = new Lexer(input);
      const tokens = lexer.tokenize();

      expect(tokens[0]).toMatchObject({ type: TokenType.IDENTIFIER, value: 'author' });
      expect(tokens[1]).toMatchObject({ type: TokenType.COLON });
      expect(tokens[2]).toMatchObject({ type: TokenType.IDENTIFIER, value: 'User' });
    });

    it('tokenizes dotted field access', () => {
      const input = "author.name";
      const lexer = new Lexer(input);
      const tokens = lexer.tokenize();

      expect(tokens[0]).toMatchObject({ type: TokenType.IDENTIFIER, value: 'author' });
      expect(tokens[1]).toMatchObject({ type: TokenType.DOT });
      expect(tokens[2]).toMatchObject({ type: TokenType.IDENTIFIER, value: 'name' });
    });

    it('tokenizes current_user', () => {
      const input = "where: author == current_user";
      const lexer = new Lexer(input);
      const tokens = lexer.tokenize();

      // where: author == current_user
      // 0: WHERE, 1: COLON, 2: author, 3: EQ, 4: current_user
      expect(tokens[4]).toMatchObject({ type: TokenType.IDENTIFIER, value: 'current_user' });
    });
  });

  describe('error handling', () => {
    it('throws on unterminated string', () => {
      const lexer = new Lexer("'unterminated");
      expect(() => lexer.tokenize()).toThrow(/unterminated string/i);
    });

    it('throws on invalid character', () => {
      const lexer = new Lexer('@');
      expect(() => lexer.tokenize()).toThrow(/unexpected character/i);
    });

    it('includes line number in error', () => {
      const lexer = new Lexer("app\n@");
      expect(() => lexer.tokenize()).toThrow(/line 2/i);
    });
  });
});
