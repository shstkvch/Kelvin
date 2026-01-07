import { Database } from './database';
import { AppNode, EntityNode, ListBlockNode, ExpressionNode, FieldRefNode, BinaryExprNode, LiteralNode, UnaryExprNode } from '../parser/ast';
import { v4 as uuidv4 } from 'uuid';

export interface QueryOptions {
  page?: number;
  perPage?: number;
  orderBy?: string;
  orderDir?: 'asc' | 'desc';
  filters?: Record<string, unknown>;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
}

export class QueryBuilder {
  private entities: Map<string, EntityNode> = new Map();

  constructor(private db: Database, private ast: AppNode) {
    for (const entity of ast.entities) {
      this.entities.set(entity.name, entity);
    }
  }

  private toTableName(entityName: string): string {
    const snake = entityName
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .replace(/^_/, '');
    // Simple pluralization
    if (snake.endsWith('y')) {
      return snake.slice(0, -1) + 'ies';
    }
    if (snake.endsWith('s') || snake.endsWith('x') || snake.endsWith('ch') || snake.endsWith('sh')) {
      return snake + 'es';
    }
    return snake + 's';
  }

  private toColumnName(fieldName: string, entity: EntityNode): string {
    const field = entity.fields.find(f => f.name === fieldName);
    if (field && field.fieldType.kind === 'relation') {
      return `${fieldName}_id`;
    }
    return fieldName;
  }

  // List query with pagination
  async list(
    entityName: string,
    listBlock: ListBlockNode,
    context: Record<string, unknown> = {},
    options: QueryOptions = {}
  ): Promise<PaginatedResult<Record<string, unknown>>> {
    const entity = this.entities.get(entityName);
    if (!entity) throw new Error(`Unknown entity: ${entityName}`);

    const tableName = this.toTableName(entityName);
    const page = options.page || 1;
    const perPage = options.perPage || 20;

    // Build SELECT clause
    const selectFields = this.buildSelectFields(listBlock.show, entity);
    const joins = this.buildJoins(listBlock.show, entity);

    // Build WHERE clause
    let whereClause = '';
    const whereParams: unknown[] = [];
    if (listBlock.where) {
      const { sql, params } = this.buildWhereClause(listBlock.where, entity, context);
      whereClause = ` WHERE ${sql}`;
      whereParams.push(...params);
    }

    // Add filter conditions
    if (options.filters) {
      for (const [key, value] of Object.entries(options.filters)) {
        if (value !== undefined && value !== null && value !== '') {
          const columnName = this.toColumnName(key, entity);
          if (whereClause) {
            whereClause += ` AND ${tableName}.${columnName} = ?`;
          } else {
            whereClause = ` WHERE ${tableName}.${columnName} = ?`;
          }
          whereParams.push(value);
        }
      }
    }

    // Build ORDER BY clause
    let orderClause = '';
    if (listBlock.orderBy) {
      const orderField = listBlock.orderBy.field.path.join('.');
      const orderDir = listBlock.orderBy.direction.toUpperCase();
      orderClause = ` ORDER BY ${orderField} ${orderDir}`;
    } else if (options.orderBy) {
      const orderDir = (options.orderDir || 'asc').toUpperCase();
      orderClause = ` ORDER BY ${options.orderBy} ${orderDir}`;
    }

    // Count total
    const countSql = `SELECT COUNT(*) as count FROM ${tableName}${joins}${whereClause}`;
    const countResult = this.db.queryOne(countSql, whereParams);
    const total = (countResult?.count as number) || 0;

    // Build final query with pagination
    const offset = (page - 1) * perPage;
    const sql = `SELECT ${selectFields} FROM ${tableName}${joins}${whereClause}${orderClause} LIMIT ? OFFSET ?`;
    const params = [...whereParams, perPage, offset];

    const rows = this.db.queryAll(sql, params);

    return {
      data: rows,
      pagination: {
        page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage),
      },
    };
  }

  // Get single entity by ID
  async findById(
    entityName: string,
    id: string
  ): Promise<Record<string, unknown> | null> {
    const entity = this.entities.get(entityName);
    if (!entity) throw new Error(`Unknown entity: ${entityName}`);

    const tableName = this.toTableName(entityName);
    const sql = `SELECT * FROM ${tableName} WHERE id = ?`;
    return this.db.queryOne(sql, [id]);
  }

  // Create new entity
  async create(
    entityName: string,
    data: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const entity = this.entities.get(entityName);
    if (!entity) throw new Error(`Unknown entity: ${entityName}`);

    const tableName = this.toTableName(entityName);
    const id = uuidv4();
    const now = new Date().toISOString();

    // Build columns and values
    const columns: string[] = ['id', 'created', 'updated'];
    const placeholders: string[] = ['?', '?', '?'];
    const values: unknown[] = [id, now, now];

    for (const [key, value] of Object.entries(data)) {
      const columnName = this.toColumnName(key, entity);
      columns.push(columnName);
      placeholders.push('?');
      values.push(value);
    }

    const sql = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`;
    this.db.run(sql, values);

    return this.findById(entityName, id) as Promise<Record<string, unknown>>;
  }

  // Update entity
  async update(
    entityName: string,
    id: string,
    data: Record<string, unknown>
  ): Promise<Record<string, unknown> | null> {
    const entity = this.entities.get(entityName);
    if (!entity) throw new Error(`Unknown entity: ${entityName}`);

    const tableName = this.toTableName(entityName);
    const now = new Date().toISOString();

    // Build SET clause
    const setClauses: string[] = ['updated = ?'];
    const values: unknown[] = [now];

    for (const [key, value] of Object.entries(data)) {
      const columnName = this.toColumnName(key, entity);
      setClauses.push(`${columnName} = ?`);
      values.push(value);
    }

    values.push(id);
    const sql = `UPDATE ${tableName} SET ${setClauses.join(', ')} WHERE id = ?`;
    this.db.run(sql, values);

    return this.findById(entityName, id);
  }

  // Delete entity
  async delete(entityName: string, id: string): Promise<boolean> {
    const entity = this.entities.get(entityName);
    if (!entity) throw new Error(`Unknown entity: ${entityName}`);

    const tableName = this.toTableName(entityName);
    const sql = `DELETE FROM ${tableName} WHERE id = ?`;
    this.db.run(sql, [id]);
    return true;
  }

  private buildSelectFields(show: FieldRefNode[], entity: EntityNode): string {
    const tableName = this.toTableName(entity.name);
    const fields: string[] = [`${tableName}.*`];

    // Add joined fields
    for (const ref of show) {
      if (ref.path.length > 1) {
        // Dotted reference like author.name
        const [relation, ...rest] = ref.path;
        const relationField = entity.fields.find(f => f.name === relation);
        if (relationField && relationField.fieldType.kind === 'relation') {
          const relatedTable = this.toTableName(relationField.fieldType.target);
          const fieldPath = rest.join('.');
          fields.push(`${relation}_joined.${fieldPath} AS "${ref.path.join('.')}"`);
        }
      }
    }

    return fields.join(', ');
  }

  private buildJoins(show: FieldRefNode[], entity: EntityNode): string {
    const joins: string[] = [];
    const tableName = this.toTableName(entity.name);
    const addedJoins = new Set<string>();

    for (const ref of show) {
      if (ref.path.length > 1) {
        const [relation] = ref.path;
        if (addedJoins.has(relation)) continue;

        const relationField = entity.fields.find(f => f.name === relation);
        if (relationField && relationField.fieldType.kind === 'relation') {
          const relatedTable = this.toTableName(relationField.fieldType.target);
          joins.push(
            ` LEFT JOIN ${relatedTable} AS ${relation}_joined ON ${tableName}.${relation}_id = ${relation}_joined.id`
          );
          addedJoins.add(relation);
        }
      }
    }

    return joins.join('');
  }

  private buildWhereClause(
    expr: ExpressionNode,
    entity: EntityNode,
    context: Record<string, unknown>
  ): { sql: string; params: unknown[] } {
    return this.buildExpression(expr, entity, context);
  }

  private buildExpression(
    expr: ExpressionNode,
    entity: EntityNode,
    context: Record<string, unknown>
  ): { sql: string; params: unknown[] } {
    switch (expr.type) {
      case 'BinaryExpr':
        return this.buildBinaryExpr(expr, entity, context);
      case 'UnaryExpr':
        return this.buildUnaryExpr(expr, entity, context);
      case 'Literal':
        return this.buildLiteral(expr);
      case 'FieldRef':
        return this.buildFieldRef(expr, entity, context);
      case 'FunctionCall':
        if (expr.name === 'now') {
          return { sql: 'CURRENT_TIMESTAMP', params: [] };
        }
        throw new Error(`Unknown function: ${expr.name}`);
      default:
        throw new Error(`Unknown expression type: ${(expr as ExpressionNode).type}`);
    }
  }

  private buildBinaryExpr(
    expr: BinaryExprNode,
    entity: EntityNode,
    context: Record<string, unknown>
  ): { sql: string; params: unknown[] } {
    const left = this.buildExpression(expr.left, entity, context);
    const right = this.buildExpression(expr.right, entity, context);

    let op: string;
    switch (expr.operator) {
      case '==':
        op = '=';
        break;
      case '!=':
        op = '!=';
        break;
      case 'and':
        op = 'AND';
        break;
      case 'or':
        op = 'OR';
        break;
      case 'in':
        // Right side should be an array literal
        if (expr.right.type === 'Literal' && Array.isArray(expr.right.value)) {
          const values = expr.right.value as unknown[];
          const placeholders = values.map(() => '?').join(', ');
          return {
            sql: `${left.sql} IN (${placeholders})`,
            params: [...left.params, ...values],
          };
        }
        op = 'IN';
        break;
      default:
        op = expr.operator;
    }

    return {
      sql: `(${left.sql} ${op} ${right.sql})`,
      params: [...left.params, ...right.params],
    };
  }

  private buildUnaryExpr(
    expr: UnaryExprNode,
    entity: EntityNode,
    context: Record<string, unknown>
  ): { sql: string; params: unknown[] } {
    const operand = this.buildExpression(expr.operand, entity, context);

    if (expr.operator === 'not' || expr.operator === '!') {
      return {
        sql: `NOT ${operand.sql}`,
        params: operand.params,
      };
    }

    throw new Error(`Unknown unary operator: ${expr.operator}`);
  }

  private buildLiteral(expr: LiteralNode): { sql: string; params: unknown[] } {
    if (expr.value === null) {
      return { sql: 'NULL', params: [] };
    }
    if (typeof expr.value === 'boolean') {
      return { sql: '?', params: [expr.value ? 1 : 0] };
    }
    return { sql: '?', params: [expr.value] };
  }

  private buildFieldRef(
    expr: FieldRefNode,
    entity: EntityNode,
    context: Record<string, unknown>
  ): { sql: string; params: unknown[] } {
    const path = expr.path;

    // Handle context variables
    if (path[0] === 'current_user') {
      if (context.current_user) {
        return { sql: '?', params: [context.current_user] };
      }
      return { sql: 'NULL', params: [] };
    }

    if (path[0] === 'role') {
      if (context.role) {
        return { sql: '?', params: [context.role] };
      }
      return { sql: 'NULL', params: [] };
    }

    // Simple field reference
    if (path.length === 1) {
      const tableName = this.toTableName(entity.name);
      const fieldName = path[0];
      const columnName = this.toColumnName(fieldName, entity);
      return { sql: `${tableName}.${columnName}`, params: [] };
    }

    // Dotted reference (relation.field)
    const [relation, ...rest] = path;
    const relationField = entity.fields.find(f => f.name === relation);
    if (relationField && relationField.fieldType.kind === 'relation') {
      return { sql: `${relation}_joined.${rest.join('.')}`, params: [] };
    }

    // Alias reference (e.g., post.author in action context)
    return { sql: path.join('.'), params: [] };
  }
}
