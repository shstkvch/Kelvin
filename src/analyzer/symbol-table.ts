import { EntityNode, ViewNode, FieldNode } from '../parser/ast';

export interface EntitySymbol {
  name: string;
  node: EntityNode;
  fields: Map<string, FieldNode>;
}

export interface ViewSymbol {
  name: string;
  node: ViewNode;
  actions: Set<string>;
}

export class SymbolTable {
  private entities: Map<string, EntitySymbol> = new Map();
  private views: Map<string, ViewSymbol> = new Map();

  // Built-in actions that don't need to be defined
  private builtInActions = new Set(['edit', 'delete']);

  // Implicit fields that are auto-generated
  private implicitFields = new Set(['id', 'created', 'updated']);

  addEntity(entity: EntityNode): boolean {
    if (this.entities.has(entity.name)) {
      return false;
    }

    const fields = new Map<string, FieldNode>();
    for (const field of entity.fields) {
      fields.set(field.name, field);
    }

    this.entities.set(entity.name, {
      name: entity.name,
      node: entity,
      fields,
    });

    return true;
  }

  addView(view: ViewNode): boolean {
    if (this.views.has(view.name)) {
      return false;
    }

    const actions = new Set<string>();
    for (const block of view.blocks) {
      if (block.type === 'Action') {
        actions.add(block.name);
      }
    }

    this.views.set(view.name, {
      name: view.name,
      node: view,
      actions,
    });

    return true;
  }

  hasEntity(name: string): boolean {
    return this.entities.has(name);
  }

  hasView(name: string): boolean {
    return this.views.has(name);
  }

  getEntity(name: string): EntitySymbol | undefined {
    return this.entities.get(name);
  }

  getView(name: string): ViewSymbol | undefined {
    return this.views.get(name);
  }

  hasField(entityName: string, fieldName: string): boolean {
    const entity = this.entities.get(entityName);
    if (!entity) return false;
    return entity.fields.has(fieldName) || this.implicitFields.has(fieldName);
  }

  getField(entityName: string, fieldName: string): FieldNode | undefined {
    const entity = this.entities.get(entityName);
    if (!entity) return undefined;
    return entity.fields.get(fieldName);
  }

  isBuiltInAction(name: string): boolean {
    return this.builtInActions.has(name);
  }

  isImplicitField(name: string): boolean {
    return this.implicitFields.has(name);
  }

  hasAction(viewName: string, actionName: string): boolean {
    if (this.builtInActions.has(actionName)) {
      return true;
    }
    const view = this.views.get(viewName);
    if (!view) return false;
    return view.actions.has(actionName);
  }

  // Get the target entity type for a relationship field
  getRelationshipTarget(entityName: string, fieldName: string): string | undefined {
    const field = this.getField(entityName, fieldName);
    if (!field) return undefined;

    if (field.fieldType.kind === 'relation') {
      return field.fieldType.target;
    }

    return undefined;
  }

  getAllEntities(): EntitySymbol[] {
    return Array.from(this.entities.values());
  }

  getAllViews(): ViewSymbol[] {
    return Array.from(this.views.values());
  }
}
