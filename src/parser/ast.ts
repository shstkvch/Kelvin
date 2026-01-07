// AST Node Types for Kelvin Language

export type ASTNode =
  | AppNode
  | ConfigNode
  | EntityNode
  | FieldNode
  | ViewNode
  | ListBlockNode
  | DetailBlockNode
  | CreateBlockNode
  | EditBlockNode
  | ActionNode
  | ExpressionNode;

export interface Location {
  line: number;
  column: number;
}

// Root node
export interface AppNode {
  type: 'App';
  name: string;
  config?: ConfigNode;
  entities: EntityNode[];
  views: ViewNode[];
  location: Location;
}

// Config block
export interface ConfigNode {
  type: 'Config';
  settings: Record<string, string | number | boolean>;
  location: Location;
}

// Entity definition
export interface EntityNode {
  type: 'Entity';
  name: string;
  fields: FieldNode[];
  validations: ValidationNode[];
  location: Location;
}

// Field definition
export interface FieldNode {
  type: 'Field';
  name: string;
  fieldType: FieldType;
  optional: boolean;
  defaultValue?: LiteralValue;
  location: Location;
}

export type FieldType =
  | TextType
  | EmailType
  | PhoneType
  | UrlType
  | IntType
  | MoneyType
  | BoolType
  | DateType
  | TimeType
  | TimestampType
  | EnumType
  | UuidType
  | RelationType;

export interface TextType {
  kind: 'text';
  minLength?: number;
  maxLength?: number;
}

export interface EmailType {
  kind: 'email';
}

export interface PhoneType {
  kind: 'phone';
}

export interface UrlType {
  kind: 'url';
}

export interface IntType {
  kind: 'int';
  min?: number;
  max?: number;
}

export interface MoneyType {
  kind: 'money';
}

export interface BoolType {
  kind: 'bool';
}

export interface DateType {
  kind: 'date';
}

export interface TimeType {
  kind: 'time';
}

export interface TimestampType {
  kind: 'timestamp';
}

export interface EnumType {
  kind: 'enum';
  values: string[];
}

export interface UuidType {
  kind: 'uuid';
}

export interface RelationType {
  kind: 'relation';
  target: string; // Entity name
}

// Validation block
export interface ValidationNode {
  type: 'Validation';
  field: string;
  rule: string;
  message?: string;
  location: Location;
}

// View definition
export interface ViewNode {
  type: 'View';
  name: string;
  visibility?: 'public' | 'authenticated';
  require?: ExpressionNode;
  blocks: ViewBlockNode[];
  location: Location;
}

export type ViewBlockNode =
  | ListBlockNode
  | DetailBlockNode
  | CreateBlockNode
  | EditBlockNode
  | ActionNode;

// List block
export interface ListBlockNode {
  type: 'ListBlock';
  entity: string;
  alias?: string;
  show: FieldRefNode[];
  where?: ExpressionNode;
  orderBy?: OrderByNode;
  filterBy?: string[];
  actions?: string[];
  location: Location;
}

// Detail block
export interface DetailBlockNode {
  type: 'DetailBlock';
  entity: string;
  alias?: string;
  show: FieldRefNode[];
  where?: ExpressionNode;
  nestedLists: ListBlockNode[];
  location: Location;
}

// Create block
export interface CreateBlockNode {
  type: 'CreateBlock';
  entity: string;
  alias?: string;
  input: string[];
  then?: ThenBlockNode;
  location: Location;
}

// Edit block
export interface EditBlockNode {
  type: 'EditBlock';
  entity: string;
  alias?: string;
  require?: ExpressionNode;
  input: string[];
  then?: ThenBlockNode;
  location: Location;
}

// Action definition
export interface ActionNode {
  type: 'Action';
  name: string;
  parameter: { name: string; entity: string };
  require?: ExpressionNode;
  then: ThenBlockNode;
  location: Location;
}

// Then block (list of statements)
export interface ThenBlockNode {
  type: 'ThenBlock';
  statements: StatementNode[];
  location: Location;
}

export type StatementNode = AssignmentNode | TriggerCallNode;

export interface AssignmentNode {
  type: 'Assignment';
  target: FieldRefNode;
  value: ExpressionNode;
  location: Location;
}

export interface TriggerCallNode {
  type: 'TriggerCall';
  name: string;
  args: ExpressionNode[];
  location: Location;
}

// Field reference (e.g., author.name, post.title)
export interface FieldRefNode {
  type: 'FieldRef';
  path: string[]; // ['author', 'name'] for author.name
  location: Location;
}

// Order by clause
export interface OrderByNode {
  type: 'OrderBy';
  field: FieldRefNode;
  direction: 'asc' | 'desc';
  location: Location;
}

// Expressions
export type ExpressionNode =
  | BinaryExprNode
  | UnaryExprNode
  | LiteralNode
  | FieldRefNode
  | FunctionCallNode;

export interface BinaryExprNode {
  type: 'BinaryExpr';
  operator: BinaryOperator;
  left: ExpressionNode;
  right: ExpressionNode;
  location: Location;
}

export type BinaryOperator =
  | '=='
  | '!='
  | '>'
  | '>='
  | '<'
  | '<='
  | 'and'
  | 'or'
  | 'in';

export interface UnaryExprNode {
  type: 'UnaryExpr';
  operator: '!' | 'not';
  operand: ExpressionNode;
  location: Location;
}

export interface LiteralNode {
  type: 'Literal';
  value: LiteralValue;
  location: Location;
}

export type LiteralValue = string | number | boolean | null;

export interface FunctionCallNode {
  type: 'FunctionCall';
  name: string;
  args: ExpressionNode[];
  location: Location;
}

// Helper type guards
export function isListBlock(node: ViewBlockNode): node is ListBlockNode {
  return node.type === 'ListBlock';
}

export function isDetailBlock(node: ViewBlockNode): node is DetailBlockNode {
  return node.type === 'DetailBlock';
}

export function isCreateBlock(node: ViewBlockNode): node is CreateBlockNode {
  return node.type === 'CreateBlock';
}

export function isEditBlock(node: ViewBlockNode): node is EditBlockNode {
  return node.type === 'EditBlock';
}

export function isAction(node: ViewBlockNode): node is ActionNode {
  return node.type === 'Action';
}

export function isFieldRef(node: ExpressionNode): node is FieldRefNode {
  return node.type === 'FieldRef';
}

export function isLiteral(node: ExpressionNode): node is LiteralNode {
  return node.type === 'Literal';
}

export function isBinaryExpr(node: ExpressionNode): node is BinaryExprNode {
  return node.type === 'BinaryExpr';
}
