export enum TokenType {
  // Keywords
  APP = 'APP',
  CONFIG = 'CONFIG',
  ENTITY = 'ENTITY',
  VIEW = 'VIEW',
  LIST = 'LIST',
  DETAIL = 'DETAIL',
  CREATE = 'CREATE',
  EDIT = 'EDIT',
  DELETE = 'DELETE',
  ACTION = 'ACTION',
  TRIGGER = 'TRIGGER',
  REQUIRE = 'REQUIRE',
  VISIBILITY = 'VISIBILITY',
  SHOW = 'SHOW',
  WHERE = 'WHERE',
  ORDER = 'ORDER',
  FILTER = 'FILTER',
  BY = 'BY',
  ACTIONS = 'ACTIONS',
  INPUT = 'INPUT',
  THEN = 'THEN',
  VALIDATE = 'VALIDATE',
  AS = 'AS',
  VIA = 'VIA',
  AND = 'AND',
  OR = 'OR',
  NOT = 'NOT',
  IN = 'IN',
  ASC = 'ASC',
  DESC = 'DESC',
  PUBLIC = 'PUBLIC',
  AUTHENTICATED = 'AUTHENTICATED',
  NOW = 'NOW',

  // Types
  TEXT = 'TEXT',
  EMAIL = 'EMAIL',
  PHONE = 'PHONE',
  URL = 'URL',
  INT = 'INT',
  MONEY = 'MONEY',
  BOOL = 'BOOL',
  DATE = 'DATE',
  TIME = 'TIME',
  TIMESTAMP = 'TIMESTAMP',
  ENUM = 'ENUM',
  UUID = 'UUID',

  // Literals
  IDENTIFIER = 'IDENTIFIER',
  STRING = 'STRING',
  NUMBER = 'NUMBER',
  TRUE = 'TRUE',
  FALSE = 'FALSE',

  // Operators
  EQ = 'EQ',           // ==
  NE = 'NE',           // !=
  GT = 'GT',           // >
  GE = 'GE',           // >=
  LT = 'LT',           // <
  LE = 'LE',           // <=
  ASSIGN = 'ASSIGN',   // =
  BANG = 'BANG',       // !
  DOT = 'DOT',         // .
  DOTDOT = 'DOTDOT',   // ..

  // Delimiters
  LBRACE = 'LBRACE',   // {
  RBRACE = 'RBRACE',   // }
  LPAREN = 'LPAREN',   // (
  RPAREN = 'RPAREN',   // )
  LBRACKET = 'LBRACKET', // [
  RBRACKET = 'RBRACKET', // ]
  COLON = 'COLON',     // :
  COMMA = 'COMMA',     // ,
  QUESTION = 'QUESTION', // ?

  // Special
  EOF = 'EOF',
}

export interface Token {
  type: TokenType;
  value: string;
  line: number;
  column: number;
}

export const KEYWORDS: Record<string, TokenType> = {
  'app': TokenType.APP,
  'config': TokenType.CONFIG,
  'entity': TokenType.ENTITY,
  'view': TokenType.VIEW,
  'list': TokenType.LIST,
  'detail': TokenType.DETAIL,
  'create': TokenType.CREATE,
  'edit': TokenType.EDIT,
  'delete': TokenType.DELETE,
  'action': TokenType.ACTION,
  'trigger': TokenType.TRIGGER,
  'require': TokenType.REQUIRE,
  'visibility': TokenType.VISIBILITY,
  'show': TokenType.SHOW,
  'where': TokenType.WHERE,
  'order': TokenType.ORDER,
  'filter': TokenType.FILTER,
  'by': TokenType.BY,
  'actions': TokenType.ACTIONS,
  'input': TokenType.INPUT,
  'then': TokenType.THEN,
  'validate': TokenType.VALIDATE,
  'as': TokenType.AS,
  'via': TokenType.VIA,
  'and': TokenType.AND,
  'or': TokenType.OR,
  'not': TokenType.NOT,
  'in': TokenType.IN,
  'asc': TokenType.ASC,
  'desc': TokenType.DESC,
  'public': TokenType.PUBLIC,
  'authenticated': TokenType.AUTHENTICATED,
  'now': TokenType.NOW,
  'text': TokenType.TEXT,
  'email': TokenType.EMAIL,
  'phone': TokenType.PHONE,
  'url': TokenType.URL,
  'int': TokenType.INT,
  'money': TokenType.MONEY,
  'bool': TokenType.BOOL,
  'date': TokenType.DATE,
  'time': TokenType.TIME,
  'timestamp': TokenType.TIMESTAMP,
  'enum': TokenType.ENUM,
  'uuid': TokenType.UUID,
  'true': TokenType.TRUE,
  'false': TokenType.FALSE,
};
