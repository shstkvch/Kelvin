import { AppNode, EntityNode, FieldNode, FieldType } from '../parser/ast';

export class SchemaGenerator {
  private entities: Map<string, EntityNode> = new Map();

  constructor(private ast: AppNode) {
    // Index entities by name
    for (const entity of ast.entities) {
      this.entities.set(entity.name, entity);
    }
  }

  generateSQL(): string[] {
    const statements: string[] = [];

    // Generate CREATE TABLE statements
    for (const entity of this.ast.entities) {
      statements.push(this.generateCreateTable(entity));
    }

    // Generate indexes for foreign keys
    for (const entity of this.ast.entities) {
      const indexes = this.generateIndexes(entity);
      statements.push(...indexes);
    }

    return statements;
  }

  private generateCreateTable(entity: EntityNode): string {
    const tableName = this.toTableName(entity.name);
    const columns: string[] = [];
    const constraints: string[] = [];

    // Add implicit id column
    columns.push('id TEXT PRIMARY KEY');

    // Add entity fields
    for (const field of entity.fields) {
      const columnDef = this.generateColumn(field);
      columns.push(columnDef.column);
      if (columnDef.constraint) {
        constraints.push(columnDef.constraint);
      }
    }

    // Add password_hash for User entity
    if (entity.name === 'User') {
      columns.push('password_hash TEXT');
    }

    // Add implicit created/updated timestamps
    columns.push('created TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
    columns.push('updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP');

    // Combine columns and constraints
    const allDefs = [...columns, ...constraints];

    return `CREATE TABLE ${tableName} (\n  ${allDefs.join(',\n  ')}\n)`;
  }

  private generateColumn(field: FieldNode): { column: string; constraint?: string } {
    const columnName = this.toColumnName(field.name, field.fieldType);
    const sqlType = this.toSqlType(field.fieldType);
    const nullable = field.optional ? '' : ' NOT NULL';
    const defaultValue = this.toDefaultValue(field.defaultValue, field.fieldType);

    const column = `${columnName} ${sqlType}${nullable}${defaultValue}`;

    // Generate foreign key constraint for relations
    if (field.fieldType.kind === 'relation') {
      const refTable = this.toTableName(field.fieldType.target);
      const constraint = `FOREIGN KEY (${columnName}) REFERENCES ${refTable}(id)`;
      return { column, constraint };
    }

    return { column };
  }

  private generateIndexes(entity: EntityNode): string[] {
    const tableName = this.toTableName(entity.name);
    const indexes: string[] = [];

    for (const field of entity.fields) {
      if (field.fieldType.kind === 'relation') {
        const columnName = this.toColumnName(field.name, field.fieldType);
        const indexName = `idx_${tableName}_${columnName}`;
        indexes.push(`CREATE INDEX ${indexName} ON ${tableName}(${columnName})`);
      }
    }

    return indexes;
  }

  private toTableName(entityName: string): string {
    // Convert PascalCase to snake_case and pluralize
    const snake = this.toSnakeCase(entityName);
    return this.pluralize(snake);
  }

  private toColumnName(fieldName: string, fieldType: FieldType): string {
    // For relations, add _id suffix
    if (fieldType.kind === 'relation') {
      return `${fieldName}_id`;
    }
    return fieldName;
  }

  private toSnakeCase(str: string): string {
    return str
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .replace(/^_/, '');
  }

  private pluralize(word: string): string {
    // Simple pluralization rules
    if (word.endsWith('y')) {
      return word.slice(0, -1) + 'ies';
    }
    if (word.endsWith('s') || word.endsWith('x') || word.endsWith('ch') || word.endsWith('sh')) {
      return word + 'es';
    }
    return word + 's';
  }

  private toSqlType(fieldType: FieldType): string {
    switch (fieldType.kind) {
      case 'text':
        if (fieldType.maxLength) {
          return `VARCHAR(${fieldType.maxLength})`;
        }
        return 'TEXT';
      case 'email':
        return 'VARCHAR(254)';
      case 'phone':
        return 'VARCHAR(20)';
      case 'url':
        return 'VARCHAR(2048)';
      case 'int':
        return 'INTEGER';
      case 'money':
        return 'DECIMAL(19,4)';
      case 'bool':
        return 'BOOLEAN';
      case 'date':
        return 'DATE';
      case 'time':
        return 'TIME';
      case 'timestamp':
        return 'TIMESTAMP';
      case 'uuid':
        return 'TEXT';
      case 'enum':
        // SQLite doesn't have native enum, use TEXT
        return 'TEXT';
      case 'relation':
        return 'TEXT';
      default:
        return 'TEXT';
    }
  }

  private toDefaultValue(value: unknown, fieldType: FieldType): string {
    if (value === undefined || value === null) {
      return '';
    }

    if (typeof value === 'boolean') {
      return ` DEFAULT ${value ? 1 : 0}`;
    }

    if (typeof value === 'number') {
      return ` DEFAULT ${value}`;
    }

    if (typeof value === 'string') {
      // Escape single quotes
      const escaped = value.replace(/'/g, "''");
      return ` DEFAULT '${escaped}'`;
    }

    return '';
  }
}
