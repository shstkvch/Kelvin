export type ErrorCode =
  | 'E001' // Duplicate name
  | 'E002' // Duplicate field name
  | 'E003' // Unknown entity
  | 'E004' // Unknown field
  | 'E005' // Unknown action
  | 'E006' // Invalid default value
  | 'E007' // Invalid constraint
  | 'E008' // User entity required for auth
  | 'E009' // Cannot use implicit field as input
  | 'E010'; // Invalid field traversal

export interface SemanticError {
  code: ErrorCode;
  message: string;
  location?: {
    line?: number;
    column?: number;
  };
}

export interface AnalysisResult {
  errors: SemanticError[];
  warnings: SemanticError[];
}

export function duplicateNameError(type: string, name: string): SemanticError {
  return {
    code: 'E001',
    message: `Duplicate ${type} name '${name}'`,
  };
}

export function duplicateFieldError(fieldName: string, entityName: string): SemanticError {
  return {
    code: 'E002',
    message: `Duplicate field name '${fieldName}' in entity '${entityName}'`,
  };
}

export function unknownEntityError(name: string): SemanticError {
  return {
    code: 'E003',
    message: `Unknown entity '${name}'`,
  };
}

export function unknownFieldError(fieldName: string, entityName: string): SemanticError {
  return {
    code: 'E004',
    message: `Unknown field '${fieldName}' in entity '${entityName}'`,
  };
}

export function unknownActionError(actionName: string): SemanticError {
  return {
    code: 'E005',
    message: `Unknown action '${actionName}'`,
  };
}

export function invalidDefaultValueError(fieldName: string, value: unknown, expectedType: string): SemanticError {
  return {
    code: 'E006',
    message: `Invalid default value '${value}' for field '${fieldName}'. Expected ${expectedType}`,
  };
}

export function invalidConstraintError(fieldName: string, min: number, max: number): SemanticError {
  return {
    code: 'E007',
    message: `Invalid constraint for field '${fieldName}': min (${min}) must be <= max (${max})`,
  };
}

export function userEntityRequiredError(): SemanticError {
  return {
    code: 'E008',
    message: `User entity is required when using 'role' or 'current_user' in authentication`,
  };
}

export function implicitFieldAsInputError(fieldName: string): SemanticError {
  return {
    code: 'E009',
    message: `Cannot use implicit field '${fieldName}' as input. Implicit fields (id, created, updated) are managed automatically.`,
  };
}

export function invalidFieldTraversalError(path: string, invalidPart: string, entityName: string): SemanticError {
  return {
    code: 'E010',
    message: `Invalid field traversal '${path}': '${invalidPart}' does not exist in '${entityName}'`,
  };
}
