import { Token, TokenType, KEYWORDS } from './tokens';

export class LexerError extends Error {
  constructor(message: string, public line: number, public column: number) {
    super(`${message} at line ${line}, column ${column}`);
    this.name = 'LexerError';
  }
}

export class Lexer {
  private input: string;
  private pos: number = 0;
  private line: number = 1;
  private column: number = 1;
  private tokens: Token[] = [];

  constructor(input: string) {
    this.input = input;
  }

  tokenize(): Token[] {
    this.tokens = [];
    this.pos = 0;
    this.line = 1;
    this.column = 1;

    while (!this.isAtEnd()) {
      this.scanToken();
    }

    this.addToken(TokenType.EOF, '');
    return this.tokens;
  }

  private scanToken(): void {
    this.skipWhitespaceAndComments();

    if (this.isAtEnd()) return;

    const char = this.current();

    // String literals
    if (char === "'") {
      this.scanString();
      return;
    }

    // Numbers (including negative)
    if (this.isDigit(char) || (char === '-' && this.isDigit(this.peek(1)))) {
      this.scanNumber();
      return;
    }

    // Identifiers and keywords
    if (this.isAlpha(char)) {
      this.scanIdentifier();
      return;
    }

    // Two-character operators
    if (char === '=' && this.peek(1) === '=') {
      this.addToken(TokenType.EQ, '==');
      this.advance();
      this.advance();
      return;
    }

    if (char === '!' && this.peek(1) === '=') {
      this.addToken(TokenType.NE, '!=');
      this.advance();
      this.advance();
      return;
    }

    if (char === '>' && this.peek(1) === '=') {
      this.addToken(TokenType.GE, '>=');
      this.advance();
      this.advance();
      return;
    }

    if (char === '<' && this.peek(1) === '=') {
      this.addToken(TokenType.LE, '<=');
      this.advance();
      this.advance();
      return;
    }

    if (char === '.' && this.peek(1) === '.') {
      this.addToken(TokenType.DOTDOT, '..');
      this.advance();
      this.advance();
      return;
    }

    // Single-character tokens
    switch (char) {
      case '=':
        this.addToken(TokenType.ASSIGN, '=');
        this.advance();
        return;
      case '!':
        this.addToken(TokenType.BANG, '!');
        this.advance();
        return;
      case '>':
        this.addToken(TokenType.GT, '>');
        this.advance();
        return;
      case '<':
        this.addToken(TokenType.LT, '<');
        this.advance();
        return;
      case '.':
        this.addToken(TokenType.DOT, '.');
        this.advance();
        return;
      case '{':
        this.addToken(TokenType.LBRACE, '{');
        this.advance();
        return;
      case '}':
        this.addToken(TokenType.RBRACE, '}');
        this.advance();
        return;
      case '(':
        this.addToken(TokenType.LPAREN, '(');
        this.advance();
        return;
      case ')':
        this.addToken(TokenType.RPAREN, ')');
        this.advance();
        return;
      case '[':
        this.addToken(TokenType.LBRACKET, '[');
        this.advance();
        return;
      case ']':
        this.addToken(TokenType.RBRACKET, ']');
        this.advance();
        return;
      case ':':
        this.addToken(TokenType.COLON, ':');
        this.advance();
        return;
      case ',':
        this.addToken(TokenType.COMMA, ',');
        this.advance();
        return;
      case '?':
        this.addToken(TokenType.QUESTION, '?');
        this.advance();
        return;
    }

    throw new LexerError(`Unexpected character '${char}'`, this.line, this.column);
  }

  private skipWhitespaceAndComments(): void {
    while (!this.isAtEnd()) {
      const char = this.current();

      if (char === ' ' || char === '\t' || char === '\r') {
        this.advance();
      } else if (char === '\n') {
        this.advance();
        this.line++;
        this.column = 1;
      } else if (char === '-' && this.peek(1) === '-') {
        // Comment - skip to end of line
        while (!this.isAtEnd() && this.current() !== '\n') {
          this.advance();
        }
      } else {
        break;
      }
    }
  }

  private scanString(): void {
    const startLine = this.line;
    const startColumn = this.column;
    this.advance(); // consume opening quote

    let value = '';
    while (!this.isAtEnd() && this.current() !== "'") {
      if (this.current() === '\n') {
        throw new LexerError('Unterminated string literal', startLine, startColumn);
      }
      if (this.current() === '\\' && this.peek(1) === "'") {
        this.advance(); // skip backslash
        value += "'";
        this.advance();
      } else {
        value += this.current();
        this.advance();
      }
    }

    if (this.isAtEnd()) {
      throw new LexerError('Unterminated string literal', startLine, startColumn);
    }

    this.advance(); // consume closing quote
    this.tokens.push({
      type: TokenType.STRING,
      value,
      line: startLine,
      column: startColumn,
    });
  }

  private scanNumber(): void {
    const startColumn = this.column;
    let value = '';

    // Handle negative sign
    if (this.current() === '-') {
      value += '-';
      this.advance();
    }

    while (!this.isAtEnd() && this.isDigit(this.current())) {
      value += this.current();
      this.advance();
    }

    this.tokens.push({
      type: TokenType.NUMBER,
      value,
      line: this.line,
      column: startColumn,
    });
  }

  private scanIdentifier(): void {
    const startColumn = this.column;
    let value = '';

    while (!this.isAtEnd() && this.isAlphaNumeric(this.current())) {
      value += this.current();
      this.advance();
    }

    // Check if it's a keyword
    const keyword = KEYWORDS[value.toLowerCase()];
    const type = keyword || TokenType.IDENTIFIER;

    // For keywords, use lowercase value; for identifiers, use original
    const tokenValue = keyword ? value.toLowerCase() : value;

    this.tokens.push({
      type,
      value: tokenValue,
      line: this.line,
      column: startColumn,
    });
  }

  private addToken(type: TokenType, value: string): void {
    this.tokens.push({
      type,
      value,
      line: this.line,
      column: this.column,
    });
  }

  private current(): string {
    return this.input[this.pos];
  }

  private peek(offset: number): string {
    const pos = this.pos + offset;
    if (pos >= this.input.length) return '\0';
    return this.input[pos];
  }

  private advance(): void {
    this.pos++;
    this.column++;
  }

  private isAtEnd(): boolean {
    return this.pos >= this.input.length;
  }

  private isDigit(char: string): boolean {
    return char >= '0' && char <= '9';
  }

  private isAlpha(char: string): boolean {
    return (char >= 'a' && char <= 'z') ||
           (char >= 'A' && char <= 'Z') ||
           char === '_';
  }

  private isAlphaNumeric(char: string): boolean {
    return this.isAlpha(char) || this.isDigit(char);
  }
}
