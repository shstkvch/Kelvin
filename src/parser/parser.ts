import { Lexer } from './lexer';
import { Token, TokenType } from './tokens';
import {
  AppNode,
  ConfigNode,
  EntityNode,
  FieldNode,
  FieldType,
  ViewNode,
  ViewBlockNode,
  ListBlockNode,
  DetailBlockNode,
  CreateBlockNode,
  EditBlockNode,
  ActionNode,
  ThenBlockNode,
  StatementNode,
  AssignmentNode,
  ExpressionNode,
  BinaryExprNode,
  UnaryExprNode,
  LiteralNode,
  FieldRefNode,
  FunctionCallNode,
  OrderByNode,
  Location,
  LiteralValue,
  BinaryOperator,
} from './ast';

export class ParseError extends Error {
  constructor(message: string, public line: number, public column: number) {
    super(`${message} at line ${line}, column ${column}`);
    this.name = 'ParseError';
  }
}

export class Parser {
  private tokens: Token[] = [];
  private pos: number = 0;

  constructor(private input: string) {}

  parse(): AppNode {
    const lexer = new Lexer(this.input);
    this.tokens = lexer.tokenize();
    this.pos = 0;

    return this.parseApp();
  }

  private parseApp(): AppNode {
    const location = this.location();
    this.expect(TokenType.APP, "Expected 'app'");
    const name = this.expectIdentifier("Expected app name");
    this.expect(TokenType.LBRACE, "Expected '{'");

    let config: ConfigNode | undefined;
    const entities: EntityNode[] = [];
    const views: ViewNode[] = [];

    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      if (this.check(TokenType.CONFIG)) {
        config = this.parseConfig();
      } else if (this.check(TokenType.ENTITY)) {
        entities.push(this.parseEntity());
      } else if (this.check(TokenType.VIEW)) {
        views.push(this.parseView());
      } else {
        this.error(`Unexpected token '${this.current().value}'`);
      }
    }

    this.expect(TokenType.RBRACE, "Expected '}'");

    return {
      type: 'App',
      name,
      config,
      entities,
      views,
      location,
    };
  }

  private parseConfig(): ConfigNode {
    const location = this.location();
    this.advance(); // consume 'config'
    this.expect(TokenType.LBRACE, "Expected '{'");

    const settings: Record<string, string | number | boolean> = {};

    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      const key = this.expectAnyIdentifier("Expected config key");
      this.expect(TokenType.COLON, "Expected ':'");
      const value = this.parseLiteralValue();
      settings[key] = value as string | number | boolean;
    }

    this.expect(TokenType.RBRACE, "Expected '}'");

    return {
      type: 'Config',
      settings,
      location,
    };
  }

  private parseEntity(): EntityNode {
    const location = this.location();
    this.advance(); // consume 'entity'
    const name = this.expectIdentifier("Expected entity name");
    this.expect(TokenType.LBRACE, "Expected '{'");

    const fields: FieldNode[] = [];

    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      if (this.check(TokenType.VALIDATE)) {
        // Skip validate blocks for now
        this.advance();
        this.expect(TokenType.LBRACE, "Expected '{'");
        this.skipBlock();
      } else {
        fields.push(this.parseField());
      }
    }

    this.expect(TokenType.RBRACE, "Expected '}'");

    return {
      type: 'Entity',
      name,
      fields,
      validations: [],
      location,
    };
  }

  private parseField(): FieldNode {
    const location = this.location();
    const name = this.expectAnyIdentifier("Expected field name");
    this.expect(TokenType.COLON, "Expected ':'");
    const fieldType = this.parseFieldType();

    let optional = false;
    if (this.check(TokenType.QUESTION)) {
      this.advance();
      optional = true;
    }

    let defaultValue: LiteralValue | undefined;
    if (this.check(TokenType.ASSIGN)) {
      this.advance();
      defaultValue = this.parseLiteralValue();
    }

    return {
      type: 'Field',
      name,
      fieldType,
      optional,
      defaultValue,
      location,
    };
  }

  private parseFieldType(): FieldType {
    const token = this.current();

    switch (token.type) {
      case TokenType.TEXT:
        this.advance();
        return this.parseTextType();
      case TokenType.EMAIL:
        this.advance();
        return { kind: 'email' };
      case TokenType.PHONE:
        this.advance();
        return { kind: 'phone' };
      case TokenType.URL:
        this.advance();
        return { kind: 'url' };
      case TokenType.INT:
        this.advance();
        return this.parseIntType();
      case TokenType.MONEY:
        this.advance();
        return { kind: 'money' };
      case TokenType.BOOL:
        this.advance();
        return { kind: 'bool' };
      case TokenType.DATE:
        this.advance();
        return { kind: 'date' };
      case TokenType.TIME:
        this.advance();
        return { kind: 'time' };
      case TokenType.TIMESTAMP:
        this.advance();
        return { kind: 'timestamp' };
      case TokenType.UUID:
        this.advance();
        return { kind: 'uuid' };
      case TokenType.ENUM:
        this.advance();
        return this.parseEnumType();
      case TokenType.IDENTIFIER:
        // It's a relation type
        const target = this.current().value;
        this.advance();
        return { kind: 'relation', target };
      default:
        this.error(`Expected field type, got '${token.value}'`);
    }
  }

  private parseTextType(): FieldType {
    if (this.check(TokenType.LPAREN)) {
      this.advance();
      const min = this.expectNumber("Expected minimum length");
      this.expect(TokenType.DOTDOT, "Expected '..'");
      const max = this.expectNumber("Expected maximum length");
      this.expect(TokenType.RPAREN, "Expected ')'");
      return { kind: 'text', minLength: min, maxLength: max };
    }
    return { kind: 'text' };
  }

  private parseIntType(): FieldType {
    if (this.check(TokenType.LPAREN)) {
      this.advance();
      const min = this.expectNumber("Expected minimum value");
      this.expect(TokenType.DOTDOT, "Expected '..'");
      const max = this.expectNumber("Expected maximum value");
      this.expect(TokenType.RPAREN, "Expected ')'");
      return { kind: 'int', min, max };
    }
    return { kind: 'int' };
  }

  private parseEnumType(): FieldType {
    this.expect(TokenType.LPAREN, "Expected '('");
    const values: string[] = [];

    values.push(this.expectString("Expected enum value"));

    while (this.check(TokenType.COMMA)) {
      this.advance();
      values.push(this.expectString("Expected enum value"));
    }

    this.expect(TokenType.RPAREN, "Expected ')'");
    return { kind: 'enum', values };
  }

  private parseView(): ViewNode {
    const location = this.location();
    this.advance(); // consume 'view'
    const name = this.expectAnyIdentifier("Expected view name");
    this.expect(TokenType.LBRACE, "Expected '{'");

    let visibility: 'public' | 'authenticated' | undefined;
    let require: ExpressionNode | undefined;
    const blocks: ViewBlockNode[] = [];

    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      if (this.check(TokenType.VISIBILITY)) {
        this.advance();
        this.expect(TokenType.COLON, "Expected ':'");
        const val = this.current().type;
        if (val === TokenType.PUBLIC) {
          visibility = 'public';
        } else if (val === TokenType.AUTHENTICATED) {
          visibility = 'authenticated';
        } else {
          this.error("Expected 'public' or 'authenticated'");
        }
        this.advance();
      } else if (this.check(TokenType.REQUIRE) && !this.checkAhead(TokenType.LBRACE, 1) && this.peek(1).type === TokenType.COLON) {
        this.advance(); // consume 'require'
        this.expect(TokenType.COLON, "Expected ':'");
        require = this.parseExpression();
      } else if (this.check(TokenType.REQUIRE)) {
        this.advance(); // consume 'require'
        require = this.parseRequireBlock();
      } else if (this.check(TokenType.LIST)) {
        blocks.push(this.parseListBlock());
      } else if (this.check(TokenType.DETAIL)) {
        blocks.push(this.parseDetailBlock());
      } else if (this.check(TokenType.CREATE)) {
        blocks.push(this.parseCreateBlock());
      } else if (this.check(TokenType.EDIT)) {
        blocks.push(this.parseEditBlock());
      } else if (this.check(TokenType.ACTION)) {
        blocks.push(this.parseAction());
      } else {
        this.error(`Unexpected token '${this.current().value}'`);
      }
    }

    this.expect(TokenType.RBRACE, "Expected '}'");

    return {
      type: 'View',
      name,
      visibility,
      require,
      blocks,
      location,
    };
  }

  private parseRequireBlock(): ExpressionNode {
    this.expect(TokenType.LBRACE, "Expected '{'");

    const conditions: ExpressionNode[] = [];
    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      conditions.push(this.parseExpression());
    }

    this.expect(TokenType.RBRACE, "Expected '}'");

    // Combine conditions with AND
    if (conditions.length === 0) {
      this.error("Expected at least one condition in require block");
    }

    let result = conditions[0];
    for (let i = 1; i < conditions.length; i++) {
      result = {
        type: 'BinaryExpr',
        operator: 'and',
        left: result,
        right: conditions[i],
        location: conditions[i].location,
      };
    }

    return result;
  }

  private parseListBlock(): ListBlockNode {
    const location = this.location();
    this.advance(); // consume 'list'
    const entity = this.expectIdentifier("Expected entity name");

    let alias: string | undefined;
    if (this.check(TokenType.AS)) {
      this.advance();
      alias = this.expectAnyIdentifier("Expected alias");
    }

    this.expect(TokenType.LBRACE, "Expected '{'");

    let show: FieldRefNode[] = [];
    let where: ExpressionNode | undefined;
    let orderBy: OrderByNode | undefined;
    let filterBy: string[] = [];
    let actions: string[] = [];

    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      if (this.check(TokenType.SHOW)) {
        this.advance();
        this.expect(TokenType.COLON, "Expected ':'");
        show = this.parseFieldRefList();
      } else if (this.check(TokenType.WHERE)) {
        this.advance();
        this.expect(TokenType.COLON, "Expected ':'");
        where = this.parseExpression();
      } else if (this.check(TokenType.ORDER)) {
        this.advance();
        this.expect(TokenType.BY, "Expected 'by'");
        this.expect(TokenType.COLON, "Expected ':'");
        orderBy = this.parseOrderBy();
      } else if (this.check(TokenType.FILTER)) {
        this.advance();
        this.expect(TokenType.BY, "Expected 'by'");
        this.expect(TokenType.COLON, "Expected ':'");
        filterBy.push(this.expectAnyIdentifier("Expected field name"));
      } else if (this.check(TokenType.ACTIONS)) {
        this.advance();
        this.expect(TokenType.COLON, "Expected ':'");
        actions = this.parseIdentifierList();
      } else {
        this.error(`Unexpected token '${this.current().value}' in list block`);
      }
    }

    this.expect(TokenType.RBRACE, "Expected '}'");

    return {
      type: 'ListBlock',
      entity,
      alias,
      show,
      where,
      orderBy,
      filterBy: filterBy.length > 0 ? filterBy : undefined,
      actions: actions.length > 0 ? actions : undefined,
      location,
    };
  }

  private parseDetailBlock(): DetailBlockNode {
    const location = this.location();
    this.advance(); // consume 'detail'
    const entity = this.expectIdentifier("Expected entity name");

    let alias: string | undefined;
    if (this.check(TokenType.AS)) {
      this.advance();
      alias = this.expectAnyIdentifier("Expected alias");
    }

    this.expect(TokenType.LBRACE, "Expected '{'");

    let show: FieldRefNode[] = [];
    let where: ExpressionNode | undefined;
    const nestedLists: ListBlockNode[] = [];

    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      if (this.check(TokenType.SHOW)) {
        this.advance();
        this.expect(TokenType.COLON, "Expected ':'");
        show = this.parseFieldRefList();
      } else if (this.check(TokenType.WHERE)) {
        this.advance();
        this.expect(TokenType.COLON, "Expected ':'");
        where = this.parseExpression();
      } else if (this.check(TokenType.LIST)) {
        nestedLists.push(this.parseListBlock());
      } else {
        this.error(`Unexpected token '${this.current().value}' in detail block`);
      }
    }

    this.expect(TokenType.RBRACE, "Expected '}'");

    return {
      type: 'DetailBlock',
      entity,
      alias,
      show,
      where,
      nestedLists,
      location,
    };
  }

  private parseCreateBlock(): CreateBlockNode {
    const location = this.location();
    this.advance(); // consume 'create'
    const entity = this.expectIdentifier("Expected entity name");

    let alias: string | undefined;
    if (this.check(TokenType.AS)) {
      this.advance();
      alias = this.expectAnyIdentifier("Expected alias");
    }

    this.expect(TokenType.LBRACE, "Expected '{'");

    let input: string[] = [];
    let then: ThenBlockNode | undefined;

    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      if (this.check(TokenType.INPUT)) {
        this.advance();
        this.expect(TokenType.COLON, "Expected ':'");
        input = this.parseIdentifierList();
      } else if (this.check(TokenType.THEN)) {
        then = this.parseThenBlock();
      } else {
        this.error(`Unexpected token '${this.current().value}' in create block`);
      }
    }

    this.expect(TokenType.RBRACE, "Expected '}'");

    return {
      type: 'CreateBlock',
      entity,
      alias,
      input,
      then,
      location,
    };
  }

  private parseEditBlock(): EditBlockNode {
    const location = this.location();
    this.advance(); // consume 'edit'
    const entity = this.expectIdentifier("Expected entity name");

    let alias: string | undefined;
    if (this.check(TokenType.AS)) {
      this.advance();
      alias = this.expectAnyIdentifier("Expected alias");
    }

    this.expect(TokenType.LBRACE, "Expected '{'");

    let require: ExpressionNode | undefined;
    let input: string[] = [];
    let then: ThenBlockNode | undefined;

    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      if (this.check(TokenType.REQUIRE)) {
        this.advance();
        this.expect(TokenType.COLON, "Expected ':'");
        require = this.parseExpression();
      } else if (this.check(TokenType.INPUT)) {
        this.advance();
        this.expect(TokenType.COLON, "Expected ':'");
        input = this.parseIdentifierList();
      } else if (this.check(TokenType.THEN)) {
        then = this.parseThenBlock();
      } else {
        this.error(`Unexpected token '${this.current().value}' in edit block`);
      }
    }

    this.expect(TokenType.RBRACE, "Expected '}'");

    return {
      type: 'EditBlock',
      entity,
      alias,
      require,
      input,
      then,
      location,
    };
  }

  private parseAction(): ActionNode {
    const location = this.location();
    this.advance(); // consume 'action'
    const name = this.expectAnyIdentifier("Expected action name");

    this.expect(TokenType.LPAREN, "Expected '('");
    const paramName = this.expectAnyIdentifier("Expected parameter name");
    this.expect(TokenType.COLON, "Expected ':'");
    const paramEntity = this.expectIdentifier("Expected entity type");
    this.expect(TokenType.RPAREN, "Expected ')'");

    this.expect(TokenType.LBRACE, "Expected '{'");

    let require: ExpressionNode | undefined;
    let then: ThenBlockNode | undefined;

    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      if (this.check(TokenType.REQUIRE)) {
        this.advance();
        if (this.check(TokenType.COLON)) {
          this.advance();
          require = this.parseExpression();
        } else if (this.check(TokenType.LBRACE)) {
          require = this.parseRequireBlock();
        } else {
          this.error("Expected ':' or '{'");
        }
      } else if (this.check(TokenType.THEN)) {
        then = this.parseThenBlock();
      } else {
        this.error(`Unexpected token '${this.current().value}' in action`);
      }
    }

    this.expect(TokenType.RBRACE, "Expected '}'");

    if (!then) {
      this.error("Action must have a 'then' block");
    }

    return {
      type: 'Action',
      name,
      parameter: { name: paramName, entity: paramEntity },
      require,
      then: then!,
      location,
    };
  }

  private parseThenBlock(): ThenBlockNode {
    const location = this.location();
    this.advance(); // consume 'then'
    this.expect(TokenType.LBRACE, "Expected '{'");

    const statements: StatementNode[] = [];

    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      statements.push(this.parseStatement());
    }

    this.expect(TokenType.RBRACE, "Expected '}'");

    return {
      type: 'ThenBlock',
      statements,
      location,
    };
  }

  private parseStatement(): StatementNode {
    const location = this.location();

    // Check for trigger call
    if (this.check(TokenType.TRIGGER)) {
      this.advance();
      this.expect(TokenType.LPAREN, "Expected '('");
      const name = this.expectString("Expected trigger name");
      const args: ExpressionNode[] = [];
      while (this.check(TokenType.COMMA)) {
        this.advance();
        args.push(this.parseExpression());
      }
      this.expect(TokenType.RPAREN, "Expected ')'");
      return {
        type: 'TriggerCall',
        name,
        args,
        location,
      };
    }

    // Otherwise it's an assignment
    const target = this.parseFieldRef();
    this.expect(TokenType.ASSIGN, "Expected '='");
    const value = this.parseExpression();

    return {
      type: 'Assignment',
      target,
      value,
      location,
    };
  }

  private parseExpression(): ExpressionNode {
    return this.parseOrExpression();
  }

  private parseOrExpression(): ExpressionNode {
    let left = this.parseAndExpression();

    while (this.check(TokenType.OR)) {
      this.advance();
      const right = this.parseAndExpression();
      left = {
        type: 'BinaryExpr',
        operator: 'or',
        left,
        right,
        location: left.location,
      };
    }

    return left;
  }

  private parseAndExpression(): ExpressionNode {
    let left = this.parseComparisonExpression();

    while (this.check(TokenType.AND)) {
      this.advance();
      const right = this.parseComparisonExpression();
      left = {
        type: 'BinaryExpr',
        operator: 'and',
        left,
        right,
        location: left.location,
      };
    }

    return left;
  }

  private parseComparisonExpression(): ExpressionNode {
    let left = this.parseUnaryExpression();

    if (this.check(TokenType.EQ) || this.check(TokenType.NE) ||
        this.check(TokenType.GT) || this.check(TokenType.GE) ||
        this.check(TokenType.LT) || this.check(TokenType.LE) ||
        this.check(TokenType.IN)) {
      const operator = this.current().value as BinaryOperator;
      this.advance();

      let right: ExpressionNode;
      if (operator === 'in') {
        right = this.parseArrayLiteral();
      } else {
        right = this.parseUnaryExpression();
      }

      left = {
        type: 'BinaryExpr',
        operator,
        left,
        right,
        location: left.location,
      };
    }

    return left;
  }

  private parseUnaryExpression(): ExpressionNode {
    if (this.check(TokenType.NOT)) {
      const location = this.location();
      this.advance();
      const operand = this.parseUnaryExpression();
      return {
        type: 'UnaryExpr',
        operator: 'not',
        operand,
        location,
      };
    }

    if (this.check(TokenType.BANG)) {
      const location = this.location();
      this.advance();
      const operand = this.parseUnaryExpression();
      return {
        type: 'UnaryExpr',
        operator: '!',
        operand,
        location,
      };
    }

    return this.parsePrimaryExpression();
  }

  private parsePrimaryExpression(): ExpressionNode {
    const location = this.location();

    // Literals
    if (this.check(TokenType.STRING)) {
      const value = this.current().value;
      this.advance();
      return { type: 'Literal', value, location };
    }

    if (this.check(TokenType.NUMBER)) {
      const value = parseInt(this.current().value, 10);
      this.advance();
      return { type: 'Literal', value, location };
    }

    if (this.check(TokenType.TRUE)) {
      this.advance();
      return { type: 'Literal', value: true, location };
    }

    if (this.check(TokenType.FALSE)) {
      this.advance();
      return { type: 'Literal', value: false, location };
    }

    // Function call: now()
    if (this.check(TokenType.NOW)) {
      this.advance();
      this.expect(TokenType.LPAREN, "Expected '('");
      this.expect(TokenType.RPAREN, "Expected ')'");
      return {
        type: 'FunctionCall',
        name: 'now',
        args: [],
        location,
      };
    }

    // Field reference or identifier
    if (this.check(TokenType.IDENTIFIER) || this.isTypeKeyword(this.current().type)) {
      return this.parseFieldRef();
    }

    // Parenthesized expression
    if (this.check(TokenType.LPAREN)) {
      this.advance();
      const expr = this.parseExpression();
      this.expect(TokenType.RPAREN, "Expected ')'");
      return expr;
    }

    this.error(`Unexpected token '${this.current().value}' in expression`);
  }

  private parseArrayLiteral(): ExpressionNode {
    const location = this.location();
    this.expect(TokenType.LBRACKET, "Expected '['");

    const elements: LiteralValue[] = [];
    if (!this.check(TokenType.RBRACKET)) {
      elements.push(this.parseLiteralValue());
      while (this.check(TokenType.COMMA)) {
        this.advance();
        elements.push(this.parseLiteralValue());
      }
    }

    this.expect(TokenType.RBRACKET, "Expected ']'");

    // Return as a special literal containing an array
    return {
      type: 'Literal',
      value: elements as unknown as LiteralValue,
      location,
    };
  }

  private parseFieldRef(): FieldRefNode {
    const location = this.location();
    const path: string[] = [];

    path.push(this.expectAnyIdentifier("Expected field name"));

    while (this.check(TokenType.DOT)) {
      this.advance();
      path.push(this.expectAnyIdentifier("Expected field name"));
    }

    return {
      type: 'FieldRef',
      path,
      location,
    };
  }

  private parseFieldRefList(): FieldRefNode[] {
    const refs: FieldRefNode[] = [];
    refs.push(this.parseFieldRef());

    while (this.check(TokenType.COMMA)) {
      this.advance();
      refs.push(this.parseFieldRef());
    }

    return refs;
  }

  private parseIdentifierList(): string[] {
    const ids: string[] = [];
    ids.push(this.expectAnyIdentifier("Expected identifier"));

    while (this.check(TokenType.COMMA)) {
      this.advance();
      ids.push(this.expectAnyIdentifier("Expected identifier"));
    }

    return ids;
  }

  private parseOrderBy(): OrderByNode {
    const location = this.location();
    const field = this.parseFieldRef();
    let direction: 'asc' | 'desc' = 'asc';

    if (this.check(TokenType.ASC)) {
      this.advance();
      direction = 'asc';
    } else if (this.check(TokenType.DESC)) {
      this.advance();
      direction = 'desc';
    }

    return {
      type: 'OrderBy',
      field,
      direction,
      location,
    };
  }

  private parseLiteralValue(): LiteralValue {
    if (this.check(TokenType.STRING)) {
      const value = this.current().value;
      this.advance();
      return value;
    }

    if (this.check(TokenType.NUMBER)) {
      const value = parseInt(this.current().value, 10);
      this.advance();
      return value;
    }

    if (this.check(TokenType.TRUE)) {
      this.advance();
      return true;
    }

    if (this.check(TokenType.FALSE)) {
      this.advance();
      return false;
    }

    this.error("Expected literal value");
  }

  // Helpers
  private isTypeKeyword(type: TokenType): boolean {
    return type === TokenType.EMAIL ||
           type === TokenType.PHONE ||
           type === TokenType.URL ||
           type === TokenType.TEXT ||
           type === TokenType.INT ||
           type === TokenType.MONEY ||
           type === TokenType.BOOL ||
           type === TokenType.DATE ||
           type === TokenType.TIME ||
           type === TokenType.TIMESTAMP ||
           type === TokenType.ENUM ||
           type === TokenType.UUID;
  }

  private skipBlock(): void {
    let depth = 1;
    while (depth > 0 && !this.isAtEnd()) {
      if (this.check(TokenType.LBRACE)) depth++;
      if (this.check(TokenType.RBRACE)) depth--;
      this.advance();
    }
  }

  private current(): Token {
    return this.tokens[this.pos];
  }

  private peek(offset: number): Token {
    const pos = this.pos + offset;
    if (pos >= this.tokens.length) return this.tokens[this.tokens.length - 1];
    return this.tokens[pos];
  }

  private check(type: TokenType): boolean {
    return this.current().type === type;
  }

  private checkAhead(type: TokenType, offset: number): boolean {
    return this.peek(offset).type === type;
  }

  private advance(): void {
    if (!this.isAtEnd()) this.pos++;
  }

  private isAtEnd(): boolean {
    return this.current().type === TokenType.EOF;
  }

  private location(): Location {
    return { line: this.current().line, column: this.current().column };
  }

  private expect(type: TokenType, message: string): void {
    if (!this.check(type)) {
      this.error(message);
    }
    this.advance();
  }

  private expectIdentifier(message: string): string {
    if (!this.check(TokenType.IDENTIFIER)) {
      this.error(message);
    }
    const value = this.current().value;
    this.advance();
    return value;
  }

  private expectAnyIdentifier(message: string): string {
    // Accept identifier, type keywords, or action keywords used as names
    if (this.check(TokenType.IDENTIFIER) ||
        this.isTypeKeyword(this.current().type) ||
        this.isActionKeyword(this.current().type)) {
      const value = this.current().value;
      this.advance();
      return value;
    }
    this.error(message);
  }

  private isActionKeyword(type: TokenType): boolean {
    return type === TokenType.EDIT ||
           type === TokenType.DELETE ||
           type === TokenType.CREATE;
  }

  private expectString(message: string): string {
    if (!this.check(TokenType.STRING)) {
      this.error(message);
    }
    const value = this.current().value;
    this.advance();
    return value;
  }

  private expectNumber(message: string): number {
    if (!this.check(TokenType.NUMBER)) {
      this.error(message);
    }
    const value = parseInt(this.current().value, 10);
    this.advance();
    return value;
  }

  private error(message: string): never {
    const token = this.current();
    throw new ParseError(message, token.line, token.column);
  }
}
