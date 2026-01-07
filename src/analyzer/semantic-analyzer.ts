import {
  AppNode,
  EntityNode,
  ViewNode,
  FieldNode,
  ListBlockNode,
  CreateBlockNode,
  EditBlockNode,
  ActionNode,
  ExpressionNode,
  FieldRefNode,
} from '../parser/ast';
import { SymbolTable } from './symbol-table';
import {
  SemanticError,
  AnalysisResult,
  duplicateNameError,
  duplicateFieldError,
  unknownEntityError,
  unknownFieldError,
  unknownActionError,
  invalidDefaultValueError,
  invalidConstraintError,
  userEntityRequiredError,
  implicitFieldAsInputError,
  invalidFieldTraversalError,
} from './errors';

export class SemanticAnalyzer {
  private symbolTable: SymbolTable = new SymbolTable();
  private errors: SemanticError[] = [];
  private warnings: SemanticError[] = [];
  private usesAuth = false;

  analyze(ast: AppNode): AnalysisResult {
    this.symbolTable = new SymbolTable();
    this.errors = [];
    this.warnings = [];
    this.usesAuth = false;

    // Pass 1: Build symbol table
    this.buildSymbolTable(ast);

    // Pass 2: Validate entities
    this.validateEntities(ast);

    // Pass 3: Validate views
    this.validateViews(ast);

    // Pass 4: Check authentication requirements
    this.checkAuthRequirements();

    return {
      errors: this.errors,
      warnings: this.warnings,
    };
  }

  private buildSymbolTable(ast: AppNode): void {
    // Register all entities first (allows forward references)
    for (const entity of ast.entities) {
      if (!this.symbolTable.addEntity(entity)) {
        this.errors.push(duplicateNameError('entity', entity.name));
      }
    }

    // Register all views
    for (const view of ast.views) {
      if (!this.symbolTable.addView(view)) {
        this.errors.push(duplicateNameError('view', view.name));
      }
    }
  }

  private validateEntities(ast: AppNode): void {
    for (const entity of ast.entities) {
      this.validateEntity(entity);
    }
  }

  private validateEntity(entity: EntityNode): void {
    const fieldNames = new Set<string>();

    for (const field of entity.fields) {
      // Check for duplicate field names
      if (fieldNames.has(field.name)) {
        this.errors.push(duplicateFieldError(field.name, entity.name));
      }
      fieldNames.add(field.name);

      // Validate field
      this.validateField(field, entity.name);
    }
  }

  private validateField(field: FieldNode, entityName: string): void {
    const { fieldType, defaultValue } = field;

    // Validate relationship targets
    if (fieldType.kind === 'relation') {
      if (!this.symbolTable.hasEntity(fieldType.target)) {
        this.errors.push(unknownEntityError(fieldType.target));
      }
    }

    // Validate constraints
    if (fieldType.kind === 'text') {
      const min = fieldType.minLength;
      const max = fieldType.maxLength;
      if (min !== undefined && max !== undefined && min > max) {
        this.errors.push(invalidConstraintError(field.name, min, max));
      }
    }

    if (fieldType.kind === 'int') {
      const min = fieldType.min;
      const max = fieldType.max;
      if (min !== undefined && max !== undefined && min > max) {
        this.errors.push(invalidConstraintError(field.name, min, max));
      }
    }

    // Validate enum default values
    if (fieldType.kind === 'enum' && defaultValue !== undefined) {
      if (typeof defaultValue === 'string' && !fieldType.values.includes(defaultValue)) {
        this.errors.push(
          invalidDefaultValueError(
            field.name,
            defaultValue,
            `one of: ${fieldType.values.map(v => `'${v}'`).join(', ')}`
          )
        );
      }
    }

    // Validate bool default values
    if (fieldType.kind === 'bool' && defaultValue !== undefined) {
      if (typeof defaultValue !== 'boolean') {
        this.errors.push(invalidDefaultValueError(field.name, defaultValue, 'boolean'));
      }
    }
  }

  private validateViews(ast: AppNode): void {
    for (const view of ast.views) {
      this.validateView(view);
    }
  }

  private validateView(view: ViewNode): void {
    // Check require clause for auth usage
    if (view.require) {
      this.checkExpressionForAuth(view.require);
    }

    // Track action names for duplicates
    const actionNames = new Set<string>();

    for (const block of view.blocks) {
      switch (block.type) {
        case 'ListBlock':
          this.validateListBlock(block, view);
          break;
        case 'CreateBlock':
          this.validateCreateBlock(block, view);
          break;
        case 'EditBlock':
          this.validateEditBlock(block, view);
          break;
        case 'Action':
          if (actionNames.has(block.name)) {
            this.errors.push(duplicateNameError('action', block.name));
          }
          actionNames.add(block.name);
          this.validateAction(block, view);
          break;
      }
    }
  }

  private validateListBlock(block: ListBlockNode, view: ViewNode): void {
    const entityName = block.entity;

    // Check entity exists
    if (!this.symbolTable.hasEntity(entityName)) {
      this.errors.push(unknownEntityError(entityName));
      return;
    }

    // Validate show fields
    for (const fieldRef of block.show) {
      this.validateFieldRef(fieldRef, entityName);
    }

    // Validate where clause
    if (block.where) {
      this.validateExpression(block.where, entityName);
    }

    // Validate actions
    if (block.actions) {
      for (const actionName of block.actions) {
        if (!this.symbolTable.hasAction(view.name, actionName)) {
          this.errors.push(unknownActionError(actionName));
        }
      }
    }
  }

  private validateCreateBlock(block: CreateBlockNode, view: ViewNode): void {
    const entityName = block.entity;

    // Check entity exists
    if (!this.symbolTable.hasEntity(entityName)) {
      this.errors.push(unknownEntityError(entityName));
      return;
    }

    // Validate input fields
    for (const fieldName of block.input) {
      // Check for implicit fields
      if (this.symbolTable.isImplicitField(fieldName)) {
        this.errors.push(implicitFieldAsInputError(fieldName));
        continue;
      }

      // Check field exists
      if (!this.symbolTable.hasField(entityName, fieldName)) {
        this.errors.push(unknownFieldError(fieldName, entityName));
      }
    }

    // Check then block for auth usage
    if (block.then) {
      for (const stmt of block.then.statements) {
        if (stmt.type === 'Assignment' && stmt.value) {
          this.checkExpressionForAuth(stmt.value);
        }
      }
    }
  }

  private validateEditBlock(block: EditBlockNode, view: ViewNode): void {
    const entityName = block.entity;

    // Check entity exists
    if (!this.symbolTable.hasEntity(entityName)) {
      this.errors.push(unknownEntityError(entityName));
      return;
    }

    // Validate require clause
    if (block.require) {
      this.checkExpressionForAuth(block.require);
    }

    // Validate input fields
    for (const fieldName of block.input) {
      // Check for implicit fields
      if (this.symbolTable.isImplicitField(fieldName)) {
        this.errors.push(implicitFieldAsInputError(fieldName));
        continue;
      }

      // Check field exists
      if (!this.symbolTable.hasField(entityName, fieldName)) {
        this.errors.push(unknownFieldError(fieldName, entityName));
      }
    }
  }

  private validateAction(action: ActionNode, view: ViewNode): void {
    const entityName = action.parameter.entity;

    // Check entity exists
    if (!this.symbolTable.hasEntity(entityName)) {
      this.errors.push(unknownEntityError(entityName));
      return;
    }

    // Check require clause for auth usage
    if (action.require) {
      this.checkExpressionForAuth(action.require);
    }
  }

  private validateFieldRef(fieldRef: FieldRefNode, entityName: string): void {
    const path = fieldRef.path;

    if (path.length === 0) return;

    let currentEntity = entityName;

    for (let i = 0; i < path.length; i++) {
      const fieldName = path[i];

      // Skip special context variables
      if (i === 0 && (fieldName === 'current_user' || fieldName === 'role')) {
        this.usesAuth = true;
        return;
      }

      // Check if field exists
      if (!this.symbolTable.hasField(currentEntity, fieldName)) {
        const fullPath = path.slice(0, i + 1).join('.');
        this.errors.push(invalidFieldTraversalError(path.join('.'), fieldName, currentEntity));
        return;
      }

      // If not last field, check if it's a relationship to get next entity
      if (i < path.length - 1) {
        const targetEntity = this.symbolTable.getRelationshipTarget(currentEntity, fieldName);
        if (!targetEntity) {
          const fullPath = path.slice(0, i + 1).join('.');
          this.errors.push(
            invalidFieldTraversalError(
              path.join('.'),
              path[i + 1],
              `cannot traverse non-relationship field '${fieldName}'`
            )
          );
          return;
        }
        currentEntity = targetEntity;
      }
    }
  }

  private validateExpression(expr: ExpressionNode, entityName: string): void {
    if (expr.type === 'FieldRef') {
      this.validateFieldRef(expr, entityName);
    } else if (expr.type === 'BinaryExpr') {
      this.validateExpression(expr.left, entityName);
      this.validateExpression(expr.right, entityName);
    } else if (expr.type === 'UnaryExpr') {
      this.validateExpression(expr.operand, entityName);
    }

    // Check for auth usage
    this.checkExpressionForAuth(expr);
  }

  private checkExpressionForAuth(expr: ExpressionNode): void {
    if (expr.type === 'FieldRef') {
      const path = expr.path;
      if (path.length > 0 && (path[0] === 'current_user' || path[0] === 'role')) {
        this.usesAuth = true;
      }
    } else if (expr.type === 'BinaryExpr') {
      this.checkExpressionForAuth(expr.left);
      this.checkExpressionForAuth(expr.right);
    } else if (expr.type === 'UnaryExpr') {
      this.checkExpressionForAuth(expr.operand);
    }
  }

  private checkAuthRequirements(): void {
    if (this.usesAuth && !this.symbolTable.hasEntity('User')) {
      this.errors.push(userEntityRequiredError());
    }
  }
}
