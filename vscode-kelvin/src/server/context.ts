import { TextDocument } from 'vscode-languageserver-textdocument';
import { Position } from 'vscode-languageserver';

export interface EntityInfo {
  name: string;
  fields: string[];
}

export interface DocumentContext {
  entities: Map<string, EntityInfo>;
  views: Set<string>;
  actions: Set<string>;
}

export type CursorContext =
  | { type: 'app_body' }
  | { type: 'entity_body'; entityName: string }
  | { type: 'field_type'; entityName: string }
  | { type: 'view_body'; viewName: string }
  | { type: 'view_property' }
  | { type: 'list_clause'; entityName: string }
  | { type: 'detail_clause'; entityName: string }
  | { type: 'create_clause'; entityName: string }
  | { type: 'edit_clause'; entityName: string }
  | { type: 'action_clause' }
  | { type: 'show_fields'; entityName: string }
  | { type: 'input_fields'; entityName: string }
  | { type: 'actions_list' }
  | { type: 'order_by'; entityName: string }
  | { type: 'order_direction' }
  | { type: 'filter_by'; entityName: string }
  | { type: 'where_expression'; entityName: string }
  | { type: 'require_expression' }
  | { type: 'then_body'; entityName: string }
  | { type: 'expression'; entityName: string | null }
  | { type: 'unknown' };

export function parseDocument(document: TextDocument): DocumentContext {
  const text = document.getText();
  const entities = new Map<string, EntityInfo>();
  const views = new Set<string>();
  const actions = new Set<string>();

  // Parse entities
  const entityRegex = /entity\s+([A-Z][a-zA-Z0-9]*)\s*\{([^}]*)\}/g;
  let match;
  while ((match = entityRegex.exec(text)) !== null) {
    const entityName = match[1];
    const body = match[2];
    const fields: string[] = [];

    // Parse field names from entity body
    const fieldRegex = /^\s*([a-z_][a-z0-9_]*)\s*:/gm;
    let fieldMatch;
    while ((fieldMatch = fieldRegex.exec(body)) !== null) {
      fields.push(fieldMatch[1]);
    }

    entities.set(entityName, { name: entityName, fields });
  }

  // Parse views
  const viewRegex = /view\s+([a-z_][a-z0-9_]*)\s*\{/g;
  while ((match = viewRegex.exec(text)) !== null) {
    views.add(match[1]);
  }

  // Parse custom actions
  const actionRegex = /action\s+([a-z_][a-z0-9_]*)\s*\(/g;
  while ((match = actionRegex.exec(text)) !== null) {
    actions.add(match[1]);
  }

  return { entities, views, actions };
}

export function getCursorContext(
  document: TextDocument,
  position: Position,
  _docContext: DocumentContext | undefined
): CursorContext {
  const text = document.getText();
  const offset = document.offsetAt(position);
  const textBefore = text.substring(0, offset);
  const lines = textBefore.split('\n');
  const currentLine = lines[lines.length - 1];

  // Check for specific clause patterns first (most specific)

  // After visibility:
  if (/visibility\s*:\s*$/i.test(currentLine)) {
    return { type: 'view_property' };
  }

  // After show:
  if (/show\s*:\s*$/i.test(currentLine)) {
    const entityName = findBlockEntity(textBefore);
    return { type: 'show_fields', entityName };
  }

  // After input:
  if (/input\s*:\s*$/i.test(currentLine)) {
    const entityName = findBlockEntity(textBefore);
    return { type: 'input_fields', entityName };
  }

  // After actions:
  if (/actions\s*:\s*$/i.test(currentLine)) {
    return { type: 'actions_list' };
  }

  // After order by: field (expecting direction)
  if (/order\s+by\s*:\s*[a-z_][a-z0-9_]*\s+$/i.test(currentLine)) {
    return { type: 'order_direction' };
  }

  // After order by:
  if (/order\s+by\s*:\s*$/i.test(currentLine)) {
    const entityName = findBlockEntity(textBefore);
    return { type: 'order_by', entityName };
  }

  // After filter by:
  if (/filter\s+by\s*:\s*$/i.test(currentLine)) {
    const entityName = findBlockEntity(textBefore);
    return { type: 'filter_by', entityName };
  }

  // After where:
  if (/where\s*:\s*$/i.test(currentLine)) {
    const entityName = findBlockEntity(textBefore);
    return { type: 'where_expression', entityName };
  }

  // After require:
  if (/require\s*:\s*$/i.test(currentLine)) {
    return { type: 'require_expression' };
  }

  // Inside then block
  if (isInsideBlock(textBefore, 'then')) {
    const entityName = findBlockEntity(textBefore);
    return { type: 'then_body', entityName };
  }

  // After field_name: in entity (field type context)
  if (/^\s*[a-z_][a-z0-9_]*\s*:\s*$/i.test(currentLine)) {
    const parentContext = findParentBlock(textBefore);
    if (parentContext === 'entity') {
      const entityName = findCurrentEntityName(textBefore);
      return { type: 'field_type', entityName };
    }
  }

  // Check parent block context
  const parentBlock = findParentBlock(textBefore);

  switch (parentBlock) {
    case 'app':
      return { type: 'app_body' };
    case 'entity': {
      const entityName = findCurrentEntityName(textBefore);
      return { type: 'entity_body', entityName };
    }
    case 'view': {
      const viewName = findCurrentViewName(textBefore);
      return { type: 'view_body', viewName };
    }
    case 'list': {
      const entityName = findBlockEntity(textBefore);
      return { type: 'list_clause', entityName };
    }
    case 'detail': {
      const entityName = findBlockEntity(textBefore);
      return { type: 'detail_clause', entityName };
    }
    case 'create': {
      const entityName = findBlockEntity(textBefore);
      return { type: 'create_clause', entityName };
    }
    case 'edit': {
      const entityName = findBlockEntity(textBefore);
      return { type: 'edit_clause', entityName };
    }
    case 'action':
      return { type: 'action_clause' };
  }

  return { type: 'unknown' };
}

function findParentBlock(textBefore: string): string | null {
  // Use a stack-based approach to properly track nested blocks
  const blockStack: (string | null)[] = [];

  // Keywords we care about for context detection
  const recognizedBlocks = ['app', 'entity', 'view', 'list', 'detail', 'create', 'edit', 'action', 'then'];
  const keywordPattern = recognizedBlocks.join('|');

  // Pattern matches:
  // 1. A recognized keyword followed by optional name and { -> capture the keyword
  // 2. Any other identifier followed by { -> treated as unrecognized block
  // 3. Just } -> closing brace
  const bracePattern = new RegExp(
    `\\b(${keywordPattern})\\b[^{}]*\\{|\\b[a-zA-Z_][a-zA-Z0-9_]*\\s*\\{|\\}`,
    'gi'
  );
  let match;

  while ((match = bracePattern.exec(textBefore)) !== null) {
    if (match[0] === '}') {
      // Closing brace - pop from stack
      blockStack.pop();
    } else if (match[1]) {
      // Recognized keyword block - push the keyword
      blockStack.push(match[1].toLowerCase());
    } else {
      // Unrecognized block (like config {}) - push null to track depth
      blockStack.push(null);
    }
  }

  // Find the innermost recognized block
  for (let i = blockStack.length - 1; i >= 0; i--) {
    if (blockStack[i] !== null) {
      return blockStack[i];
    }
  }

  return null;
}

function isInsideBlock(textBefore: string, blockType: string): boolean {
  const pattern = new RegExp(`\\b${blockType}\\s*\\{`, 'g');
  let depth = 0;
  let inBlock = false;
  let pos = 0;

  while (pos < textBefore.length) {
    const remaining = textBefore.substring(pos);
    const blockMatch = pattern.exec(remaining);
    const closeIndex = remaining.indexOf('}');

    if (blockMatch && (closeIndex === -1 || blockMatch.index < closeIndex)) {
      if (blockMatch[0].includes(blockType)) {
        inBlock = true;
        depth++;
      }
      pos += blockMatch.index + blockMatch[0].length;
      pattern.lastIndex = 0;
    } else if (closeIndex !== -1) {
      if (inBlock) depth--;
      if (depth === 0) inBlock = false;
      pos += closeIndex + 1;
    } else {
      break;
    }
  }

  return inBlock && depth > 0;
}

function findCurrentEntityName(textBefore: string): string {
  const match = textBefore.match(/entity\s+([A-Z][a-zA-Z0-9]*)\s*\{[^}]*$/);
  return match ? match[1] : '';
}

function findCurrentViewName(textBefore: string): string {
  const match = textBefore.match(/view\s+([a-z_][a-z0-9_]*)\s*\{[^}]*$/);
  return match ? match[1] : '';
}

function findBlockEntity(textBefore: string): string {
  // Find the most recent list/detail/create/edit Entity pattern
  const matches = textBefore.match(/\b(?:list|detail|create|edit)\s+([A-Z][a-zA-Z0-9]*)/g);
  if (matches && matches.length > 0) {
    const lastMatch = matches[matches.length - 1];
    const entityMatch = lastMatch.match(/(?:list|detail|create|edit)\s+([A-Z][a-zA-Z0-9]*)/);
    return entityMatch ? entityMatch[1] : '';
  }
  return '';
}
