import {
  CompletionItem,
  CompletionItemKind,
  InsertTextFormat,
  MarkupKind,
  Position,
} from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { getCursorContext, DocumentContext } from './context';

// Helper to create markdown documentation
function docs(description: string, example?: string): { kind: typeof MarkupKind.Markdown; value: string } {
  let value = description;
  if (example) {
    value += `\n\n**Example:**\n\`\`\`kelvin\n${example}\n\`\`\``;
  }
  return { kind: MarkupKind.Markdown, value };
}

// Field type completions
const FIELD_TYPES: CompletionItem[] = [
  {
    label: 'text',
    kind: CompletionItemKind.TypeParameter,
    detail: 'String with length constraints',
    documentation: docs(
      'A text string with minimum and maximum length validation.\n\n' +
      '- `text(1..100)` — Required, 1-100 characters\n' +
      '- `text(0..500)` — Optional empty, up to 500 chars\n' +
      '- `text?` — Optional field (can be null)',
      'title: text(1..200)\nbio: text(0..1000)?'
    ),
    insertText: 'text(${1:1}..${2:100})',
    insertTextFormat: InsertTextFormat.Snippet,
  },
  {
    label: 'email',
    kind: CompletionItemKind.TypeParameter,
    detail: 'Email with validation',
    documentation: docs(
      'An email address with automatic format validation.\n\n' +
      'Validates against standard email format and stores as VARCHAR(254).',
      'contact: email\nwork_email: email?'
    ),
  },
  {
    label: 'phone',
    kind: CompletionItemKind.TypeParameter,
    detail: 'Phone number',
    documentation: docs(
      'A phone number field.\n\n' +
      'Stores as VARCHAR(20). No specific format validation.',
      'mobile: phone\noffice: phone?'
    ),
  },
  {
    label: 'url',
    kind: CompletionItemKind.TypeParameter,
    detail: 'URL with validation',
    documentation: docs(
      'A URL with format validation.\n\n' +
      'Validates URL format and stores as VARCHAR(2048).',
      'website: url\nlinkedin: url?'
    ),
  },
  {
    label: 'int',
    kind: CompletionItemKind.TypeParameter,
    detail: 'Integer with range',
    documentation: docs(
      'An integer with optional min/max range validation.\n\n' +
      '- `int(0..100)` — 0 to 100 inclusive\n' +
      '- `int(1..)` — Minimum 1, no maximum\n' +
      '- `int(..10)` — Maximum 10, no minimum\n' +
      '- `int` — Any integer',
      'age: int(0..150)\nquantity: int(1..)\npriority: int(1..5) = 3'
    ),
    insertText: 'int(${1:0}..${2:})',
    insertTextFormat: InsertTextFormat.Snippet,
  },
  {
    label: 'money',
    kind: CompletionItemKind.TypeParameter,
    detail: 'Decimal currency',
    documentation: docs(
      'A decimal value for currency with 4 decimal places precision.\n\n' +
      'Stored as DECIMAL(19,4). Displayed with 2 decimal places.',
      'price: money\ndiscount: money?'
    ),
  },
  {
    label: 'bool',
    kind: CompletionItemKind.TypeParameter,
    detail: 'Boolean true/false',
    documentation: docs(
      'A boolean field (true/false).\n\n' +
      'Can have a default value.',
      'active: bool = true\npublished: bool = false\nfeatured: bool'
    ),
  },
  {
    label: 'date',
    kind: CompletionItemKind.TypeParameter,
    detail: 'Date (YYYY-MM-DD)',
    documentation: docs(
      'A date without time component.\n\n' +
      'Format: YYYY-MM-DD. Use `today()` for default.',
      "due_date: date\nstart_date: date = today()\nbirth_date: date?"
    ),
  },
  {
    label: 'time',
    kind: CompletionItemKind.TypeParameter,
    detail: 'Time (HH:MM)',
    documentation: docs(
      'A time without date component.\n\n' +
      'Format: HH:MM (24-hour).',
      'start_time: time\nend_time: time?'
    ),
  },
  {
    label: 'timestamp',
    kind: CompletionItemKind.TypeParameter,
    detail: 'Date and time',
    documentation: docs(
      'A full timestamp with date and time.\n\n' +
      'Use `now()` for current timestamp as default.',
      'published_at: timestamp?\nlast_login: timestamp = now()'
    ),
  },
  {
    label: 'enum',
    kind: CompletionItemKind.TypeParameter,
    detail: 'Enumeration of values',
    documentation: docs(
      'A field restricted to specific string values.\n\n' +
      'Values are case-sensitive. Can have a default.',
      "status: enum('draft', 'published', 'archived') = 'draft'\npriority: enum('low', 'medium', 'high')"
    ),
    insertText: "enum('${1:value1}', '${2:value2}')",
    insertTextFormat: InsertTextFormat.Snippet,
  },
  {
    label: 'uuid',
    kind: CompletionItemKind.TypeParameter,
    detail: 'Unique identifier',
    documentation: docs(
      'A universally unique identifier.\n\n' +
      'Use `generate()` to auto-generate on creation.',
      'external_id: uuid = generate()\nref_code: uuid?'
    ),
  },
];

// Visibility values
const VISIBILITY_VALUES: CompletionItem[] = [
  {
    label: 'public',
    kind: CompletionItemKind.EnumMember,
    detail: 'No authentication required',
    documentation: docs(
      'Makes this view accessible without authentication.\n\n' +
      'Use for public-facing pages like landing pages, public listings, etc.',
      'view blog {\n  visibility: public\n  \n  list Post {\n    show: title, created\n    where: published\n  }\n}'
    ),
  },
  {
    label: 'authenticated',
    kind: CompletionItemKind.EnumMember,
    detail: 'User must be logged in',
    documentation: docs(
      'Requires user to be logged in (default behavior).\n\n' +
      'This is the default if visibility is not specified.',
      'view dashboard {\n  visibility: authenticated\n  -- or simply omit visibility\n}'
    ),
  },
];

// Top-level keywords inside app
const APP_KEYWORDS: CompletionItem[] = [
  {
    label: 'config',
    kind: CompletionItemKind.Keyword,
    detail: 'Application configuration',
    documentation: docs(
      'Configure application-wide settings.\n\n' +
      '**Available options:**\n' +
      '- `accent` — Primary UI color (hex)\n' +
      '- `currency` — Default currency code\n' +
      '- `date_format` — Date display format\n' +
      '- `timezone` — Default timezone\n' +
      '- `pagination` — Items per page',
      "config {\n  accent: '#6366F1'\n  currency: 'GBP'\n  pagination: 25\n}"
    ),
    insertText: 'config {\n  ${0}\n}',
    insertTextFormat: InsertTextFormat.Snippet,
  },
  {
    label: 'entity',
    kind: CompletionItemKind.Keyword,
    detail: 'Define a data model',
    documentation: docs(
      'Define a data entity (database table).\n\n' +
      '**Implicit fields** (auto-added):\n' +
      '- `id: uuid` — Primary key\n' +
      '- `created: timestamp` — Creation time\n' +
      '- `updated: timestamp` — Last update time\n\n' +
      '**Special entity:** Name an entity `User` to enable authentication.',
      'entity Post {\n  title: text(1..200)\n  body: text(1..50000)\n  published: bool = false\n  author: User\n}'
    ),
    insertText: 'entity ${1:Name} {\n  ${0}\n}',
    insertTextFormat: InsertTextFormat.Snippet,
  },
  {
    label: 'view',
    kind: CompletionItemKind.Keyword,
    detail: 'Define API endpoints',
    documentation: docs(
      'Define a view containing API endpoints and UI pages.\n\n' +
      'Views group related operations together and control access.',
      'view admin {\n  require: role == \'admin\'\n  \n  list User {\n    show: email, name, role, created\n    actions: edit, delete\n  }\n}'
    ),
    insertText: 'view ${1:name} {\n  ${0}\n}',
    insertTextFormat: InsertTextFormat.Snippet,
  },
];

// View body keywords
const VIEW_KEYWORDS: CompletionItem[] = [
  {
    label: 'visibility',
    kind: CompletionItemKind.Keyword,
    detail: 'Set access level',
    documentation: docs(
      'Control who can access this view.\n\n' +
      '- `public` — No authentication required\n' +
      '- `authenticated` — Must be logged in (default)',
      'view blog {\n  visibility: public\n  ...\n}'
    ),
    insertText: 'visibility: ${1|public,authenticated|}',
    insertTextFormat: InsertTextFormat.Snippet,
  },
  {
    label: 'require',
    kind: CompletionItemKind.Keyword,
    detail: 'Access control condition',
    documentation: docs(
      'Add access control conditions to this view.\n\n' +
      '**Available variables:**\n' +
      '- `current_user` — The logged-in User\n' +
      '- `role` — Shorthand for `current_user.role`\n\n' +
      'All conditions must be true for access.',
      "view admin {\n  require: role == 'admin'\n  ...\n}\n\nview manager {\n  require: role in ['admin', 'manager']\n  ...\n}"
    ),
    insertText: 'require: ${0}',
    insertTextFormat: InsertTextFormat.Snippet,
  },
  {
    label: 'list',
    kind: CompletionItemKind.Keyword,
    detail: 'Display multiple records',
    documentation: docs(
      'Create a list view showing multiple records in a table.\n\n' +
      '**Clauses:**\n' +
      '- `show` — Fields to display as columns\n' +
      '- `where` — Filter condition (always applied)\n' +
      '- `order by` — Default sort order\n' +
      '- `filter by` — User-controllable filters\n' +
      '- `actions` — Row actions (edit, delete, custom)',
      'list Post {\n  show: title, author.name, published, created\n  where: published\n  order by: created desc\n  filter by: published\n  actions: edit, delete\n}'
    ),
    insertText: 'list ${1:Entity} {\n  show: ${2:*}\n  ${0}\n}',
    insertTextFormat: InsertTextFormat.Snippet,
  },
  {
    label: 'detail',
    kind: CompletionItemKind.Keyword,
    detail: 'Display single record',
    documentation: docs(
      'Create a detail view showing a single record.\n\n' +
      'Use `as` to bind the entity for use in conditions.',
      'detail Post as post {\n  show: title, body, author, created\n  where: post.published or post.author == current_user\n}'
    ),
    insertText: 'detail ${1:Entity} as ${2:entity} {\n  show: ${3:*}\n  ${0}\n}',
    insertTextFormat: InsertTextFormat.Snippet,
  },
  {
    label: 'create',
    kind: CompletionItemKind.Keyword,
    detail: 'Create new records',
    documentation: docs(
      'Create a form for adding new records.\n\n' +
      '- `input` — Fields the user fills in\n' +
      '- `then` — Set computed values after validation',
      'create Post as post {\n  input: title, body\n  then {\n    post.author = current_user\n    post.published = false\n  }\n}'
    ),
    insertText: 'create ${1:Entity} as ${2:entity} {\n  input: ${3:field1, field2}\n  ${0}\n}',
    insertTextFormat: InsertTextFormat.Snippet,
  },
  {
    label: 'edit',
    kind: CompletionItemKind.Keyword,
    detail: 'Update existing records',
    documentation: docs(
      'Create a form for editing existing records.\n\n' +
      '- `require` — Who can edit (access control)\n' +
      '- `input` — Fields that can be modified\n' +
      '- `then` — Logic after save',
      "edit Post as post {\n  require: post.author == current_user or role == 'admin'\n  input: title, body, published\n}"
    ),
    insertText: 'edit ${1:Entity} as ${2:entity} {\n  input: ${3:field1, field2}\n  ${0}\n}',
    insertTextFormat: InsertTextFormat.Snippet,
  },
  {
    label: 'action',
    kind: CompletionItemKind.Keyword,
    detail: 'Custom action',
    documentation: docs(
      'Define a custom action that can be triggered on records.\n\n' +
      'Actions appear as buttons in list views when added to `actions:`.',
      'action publish(post: Post) {\n  require: post.author == current_user\n  then {\n    post.published = true\n    post.published_at = now()\n  }\n}\n\nlist Post {\n  actions: edit, publish, delete\n}'
    ),
    insertText: 'action ${1:name}(${2:entity}: ${3:Entity}) {\n  then {\n    ${0}\n  }\n}',
    insertTextFormat: InsertTextFormat.Snippet,
  },
];

// List block clauses
const LIST_CLAUSES: CompletionItem[] = [
  {
    label: 'show',
    kind: CompletionItemKind.Keyword,
    detail: 'Fields to display',
    documentation: docs(
      'Specify which fields to display as columns.\n\n' +
      '- Use `*` for all fields\n' +
      '- Use dot notation for relationships: `author.name`\n' +
      '- Can traverse up to 3 levels deep',
      'show: title, author.name, created\nshow: *\nshow: name, category.name, category.parent.name'
    ),
    insertText: 'show: ${0}',
    insertTextFormat: InsertTextFormat.Snippet,
  },
  {
    label: 'where',
    kind: CompletionItemKind.Keyword,
    detail: 'Filter condition',
    documentation: docs(
      'Filter records with a condition (always applied).\n\n' +
      'Users cannot override this filter — use `filter by` for user controls.',
      'where: published\nwhere: status == \'active\'\nwhere: created >= days_ago(30)'
    ),
    insertText: 'where: ${0}',
    insertTextFormat: InsertTextFormat.Snippet,
  },
  {
    label: 'order by',
    kind: CompletionItemKind.Keyword,
    detail: 'Sort order',
    documentation: docs(
      'Set the default sort order.\n\n' +
      '- `asc` — Ascending (A-Z, oldest first)\n' +
      '- `desc` — Descending (Z-A, newest first)',
      'order by: created desc\norder by: name asc\norder by: priority desc'
    ),
    insertText: 'order by: ${1:field} ${2|asc,desc|}',
    insertTextFormat: InsertTextFormat.Snippet,
  },
  {
    label: 'filter by',
    kind: CompletionItemKind.Keyword,
    detail: 'UI filter fields',
    documentation: docs(
      'Add user-controllable filter dropdowns to the UI.\n\n' +
      '- Enum fields → dropdown with options\n' +
      '- Bool fields → checkbox\n' +
      '- Relationships → dropdown with related records\n' +
      '- Date fields → date picker',
      'filter by: status\nfilter by: category, author\nfilter by: published, created'
    ),
    insertText: 'filter by: ${0}',
    insertTextFormat: InsertTextFormat.Snippet,
  },
  {
    label: 'actions',
    kind: CompletionItemKind.Keyword,
    detail: 'Available actions',
    documentation: docs(
      'Add action buttons to each row.\n\n' +
      '**Built-in actions:**\n' +
      '- `edit` — Navigate to edit form\n' +
      '- `delete` — Delete the record\n\n' +
      'Custom actions defined with `action` can also be used.',
      'actions: edit, delete\nactions: edit, publish, archive, delete'
    ),
    insertText: 'actions: ${0}',
    insertTextFormat: InsertTextFormat.Snippet,
  },
];

// Detail block clauses
const DETAIL_CLAUSES: CompletionItem[] = [
  {
    label: 'show',
    kind: CompletionItemKind.Keyword,
    detail: 'Fields to display',
    documentation: docs(
      'Specify which fields to display.\n\n' +
      'Use `*` for all fields or list specific fields.',
      'show: title, body, author, created\nshow: *'
    ),
    insertText: 'show: ${0}',
    insertTextFormat: InsertTextFormat.Snippet,
  },
  {
    label: 'where',
    kind: CompletionItemKind.Keyword,
    detail: 'Filter condition',
    documentation: docs(
      'Add access control for viewing this record.\n\n' +
      'Use the bound entity name to reference the record.',
      'detail Post as post {\n  where: post.published or post.author == current_user\n}'
    ),
    insertText: 'where: ${0}',
    insertTextFormat: InsertTextFormat.Snippet,
  },
];

// Create/Edit block clauses
const CREATE_EDIT_CLAUSES: CompletionItem[] = [
  {
    label: 'input',
    kind: CompletionItemKind.Keyword,
    detail: 'Editable fields',
    documentation: docs(
      'Specify which fields the user can fill in.\n\n' +
      'Cannot include implicit fields (id, created, updated).',
      'input: title, body\ninput: name, email, role'
    ),
    insertText: 'input: ${0}',
    insertTextFormat: InsertTextFormat.Snippet,
  },
  {
    label: 'then',
    kind: CompletionItemKind.Keyword,
    detail: 'Post-save logic',
    documentation: docs(
      'Set computed values after validation, before save.\n\n' +
      'Use this to set timestamps, assign ownership, or trigger actions.',
      'then {\n  post.author = current_user\n  post.created = now()\n  trigger(\'notify_admin\', post)\n}'
    ),
    insertText: 'then {\n  ${0}\n}',
    insertTextFormat: InsertTextFormat.Snippet,
  },
];

// Edit block has require too
const EDIT_CLAUSES: CompletionItem[] = [
  {
    label: 'require',
    kind: CompletionItemKind.Keyword,
    detail: 'Access control',
    documentation: docs(
      'Control who can edit this record.\n\n' +
      'Use the bound entity name to reference the record being edited.',
      "edit Post as post {\n  require: post.author == current_user or role == 'admin'\n  input: title, body\n}"
    ),
    insertText: 'require: ${0}',
    insertTextFormat: InsertTextFormat.Snippet,
  },
  ...CREATE_EDIT_CLAUSES,
];

// Action block clauses
const ACTION_CLAUSES: CompletionItem[] = [
  {
    label: 'require',
    kind: CompletionItemKind.Keyword,
    detail: 'Access control',
    documentation: docs(
      'Control who can execute this action.\n\n' +
      'Reference the action parameter to check ownership.',
      'action archive(post: Post) {\n  require: post.author == current_user\n  then { ... }\n}'
    ),
    insertText: 'require: ${0}',
    insertTextFormat: InsertTextFormat.Snippet,
  },
  {
    label: 'then',
    kind: CompletionItemKind.Keyword,
    detail: 'Action logic',
    documentation: docs(
      'Define what happens when the action executes.\n\n' +
      'Can modify the entity, set fields, or trigger external actions.',
      'then {\n  post.published = true\n  post.published_at = now()\n}'
    ),
    insertText: 'then {\n  ${0}\n}',
    insertTextFormat: InsertTextFormat.Snippet,
  },
];

// Built-in functions
const BUILTIN_FUNCTIONS: CompletionItem[] = [
  {
    label: 'now()',
    kind: CompletionItemKind.Function,
    detail: 'Current timestamp',
    documentation: docs(
      'Returns the current date and time.\n\n' +
      'Use for timestamps, audit fields, etc.',
      'published_at: timestamp = now()\n\nthen {\n  post.updated_at = now()\n}'
    ),
    insertText: 'now()',
  },
  {
    label: 'today()',
    kind: CompletionItemKind.Function,
    detail: 'Current date',
    documentation: docs(
      'Returns the current date (without time).\n\n' +
      'Use for date fields, due dates, etc.',
      'due_date: date = today()\n\nwhere: due_date <= today()'
    ),
    insertText: 'today()',
  },
  {
    label: 'generate()',
    kind: CompletionItemKind.Function,
    detail: 'Generate UUID',
    documentation: docs(
      'Generates a new UUID.\n\n' +
      'Use for external IDs, reference codes, etc.',
      'external_id: uuid = generate()\nref_code: uuid = generate()'
    ),
    insertText: 'generate()',
  },
  {
    label: 'days_ago',
    kind: CompletionItemKind.Function,
    detail: 'Date n days ago',
    documentation: docs(
      'Returns a date n days in the past.\n\n' +
      'Useful for filtering recent records.',
      'where: created >= days_ago(7)   -- last week\nwhere: updated >= days_ago(30)  -- last month'
    ),
    insertText: 'days_ago(${1:n})',
    insertTextFormat: InsertTextFormat.Snippet,
  },
  {
    label: 'days_from_now',
    kind: CompletionItemKind.Function,
    detail: 'Date n days from now',
    documentation: docs(
      'Returns a date n days in the future.\n\n' +
      'Useful for due dates, expiry, etc.',
      'then {\n  task.due_date = days_from_now(7)\n}\n\nwhere: expires_at <= days_from_now(30)'
    ),
    insertText: 'days_from_now(${1:n})',
    insertTextFormat: InsertTextFormat.Snippet,
  },
  {
    label: 'next_sequence',
    kind: CompletionItemKind.Function,
    detail: 'Next sequence number',
    documentation: docs(
      'Returns the next auto-incrementing number for an entity.\n\n' +
      'Useful for invoice numbers, order IDs, etc.',
      'then {\n  invoice.number = next_sequence(Invoice)\n}'
    ),
    insertText: 'next_sequence(${1:Entity})',
    insertTextFormat: InsertTextFormat.Snippet,
  },
  {
    label: 'trigger',
    kind: CompletionItemKind.Function,
    detail: 'Fire a trigger',
    documentation: docs(
      'Execute an external trigger (webhook, email, etc.).\n\n' +
      'Triggers are defined in the `triggers/` folder.',
      "then {\n  trigger('send_welcome_email', user)\n  trigger('notify_slack', order)\n}"
    ),
    insertText: "trigger('${1:name}', ${2:entity})",
    insertTextFormat: InsertTextFormat.Snippet,
  },
];

// Expression operators
const OPERATORS: CompletionItem[] = [
  {
    label: 'and',
    kind: CompletionItemKind.Operator,
    detail: 'Logical AND',
    documentation: docs(
      'Both conditions must be true.',
      "where: published and author == current_user\nrequire: role == 'admin' and active"
    ),
  },
  {
    label: 'or',
    kind: CompletionItemKind.Operator,
    detail: 'Logical OR',
    documentation: docs(
      'Either condition can be true.',
      "where: status == 'draft' or status == 'review'\nrequire: post.author == current_user or role == 'admin'"
    ),
  },
  {
    label: 'not',
    kind: CompletionItemKind.Operator,
    detail: 'Logical NOT',
    documentation: docs(
      'Negates a condition.',
      'where: not published\nwhere: not (deleted or archived)'
    ),
  },
  {
    label: 'in',
    kind: CompletionItemKind.Operator,
    detail: 'List membership',
    documentation: docs(
      'Check if value is in a list.',
      "where: status in ['active', 'pending']\nrequire: role in ['admin', 'moderator']"
    ),
  },
];

// Context variables
const CONTEXT_VARIABLES: CompletionItem[] = [
  {
    label: 'current_user',
    kind: CompletionItemKind.Variable,
    detail: 'The logged-in User entity',
    documentation: docs(
      'Reference to the currently logged-in user.\n\n' +
      'Only available in authenticated views. Access any User field.',
      'where: author == current_user\nthen {\n  post.author = current_user\n}\nrequire: current_user.verified'
    ),
  },
  {
    label: 'role',
    kind: CompletionItemKind.Variable,
    detail: 'Shorthand for current_user.role',
    documentation: docs(
      'Shorthand for accessing the current user\'s role.\n\n' +
      'Equivalent to `current_user.role`. Requires a `role` field on User entity.',
      "require: role == 'admin'\nrequire: role in ['admin', 'editor']"
    ),
  },
];

// Built-in actions
const BUILTIN_ACTIONS: CompletionItem[] = [
  {
    label: 'edit',
    kind: CompletionItemKind.Keyword,
    detail: 'Navigate to edit form',
    documentation: docs(
      'Built-in action that navigates to the edit form.\n\n' +
      'Requires an `edit` block defined in the same view.',
      'list Post {\n  actions: edit, delete\n}\n\nedit Post as post {\n  input: title, body\n}'
    ),
  },
  {
    label: 'delete',
    kind: CompletionItemKind.Keyword,
    detail: 'Delete the entity',
    documentation: docs(
      'Built-in action that deletes the record.\n\n' +
      'Shows a confirmation dialog before deletion.',
      'list Post {\n  actions: edit, delete\n}'
    ),
  },
];

// Order direction
const ORDER_DIRECTIONS: CompletionItem[] = [
  {
    label: 'asc',
    kind: CompletionItemKind.Keyword,
    detail: 'Ascending order',
    documentation: docs(
      'Sort in ascending order.\n\n' +
      '- Numbers: smallest to largest\n' +
      '- Text: A to Z\n' +
      '- Dates: oldest to newest',
      'order by: name asc\norder by: priority asc'
    ),
  },
  {
    label: 'desc',
    kind: CompletionItemKind.Keyword,
    detail: 'Descending order',
    documentation: docs(
      'Sort in descending order.\n\n' +
      '- Numbers: largest to smallest\n' +
      '- Text: Z to A\n' +
      '- Dates: newest to oldest',
      'order by: created desc\norder by: priority desc'
    ),
  },
];

// Literals
const LITERALS: CompletionItem[] = [
  {
    label: 'true',
    kind: CompletionItemKind.Value,
    detail: 'Boolean true',
    documentation: docs('Boolean true value.', 'active: bool = true\nwhere: published == true'),
  },
  {
    label: 'false',
    kind: CompletionItemKind.Value,
    detail: 'Boolean false',
    documentation: docs('Boolean false value.', 'published: bool = false\nwhere: deleted == false'),
  },
  {
    label: 'null',
    kind: CompletionItemKind.Value,
    detail: 'Null value',
    documentation: docs('Null/empty value. Only valid for optional fields.', 'where: deleted_at == null'),
  },
];

export function getCompletions(
  document: TextDocument,
  position: Position,
  docContext: DocumentContext | undefined
): CompletionItem[] {
  const context = getCursorContext(document, position, docContext);

  switch (context.type) {
    case 'app_body':
      return APP_KEYWORDS;

    case 'entity_body':
      return [];

    case 'field_type':
      return [...FIELD_TYPES, ...getEntityCompletions(docContext)];

    case 'view_body':
      return VIEW_KEYWORDS;

    case 'view_property':
      return VISIBILITY_VALUES;

    case 'list_clause':
      return LIST_CLAUSES;

    case 'detail_clause':
      return DETAIL_CLAUSES;

    case 'create_clause':
      return CREATE_EDIT_CLAUSES;

    case 'edit_clause':
      return EDIT_CLAUSES;

    case 'action_clause':
      return ACTION_CLAUSES;

    case 'show_fields':
    case 'order_by':
    case 'filter_by':
      return [
        {
          label: '*',
          kind: CompletionItemKind.Keyword,
          detail: 'All fields',
          documentation: docs('Show all fields from this entity.', 'show: *'),
        },
        ...getFieldCompletions(docContext, context.entityName),
      ];

    case 'input_fields':
      return getFieldCompletions(docContext, context.entityName);

    case 'actions_list':
      return [...BUILTIN_ACTIONS, ...getCustomActionCompletions(docContext)];

    case 'order_direction':
      return ORDER_DIRECTIONS;

    case 'where_expression':
      return [
        ...getFieldCompletions(docContext, context.entityName),
        ...CONTEXT_VARIABLES,
        ...OPERATORS,
        ...BUILTIN_FUNCTIONS,
        ...LITERALS,
      ];

    case 'require_expression':
      return [...CONTEXT_VARIABLES, ...OPERATORS, ...LITERALS];

    case 'then_body':
      return [
        ...getFieldCompletions(docContext, context.entityName),
        ...BUILTIN_FUNCTIONS,
        ...CONTEXT_VARIABLES,
        ...LITERALS,
      ];

    case 'expression':
      return [...CONTEXT_VARIABLES, ...OPERATORS, ...BUILTIN_FUNCTIONS, ...LITERALS];

    default:
      return [];
  }
}

function getEntityCompletions(docContext: DocumentContext | undefined): CompletionItem[] {
  if (!docContext?.entities) return [];

  return Array.from(docContext.entities.keys()).map((name) => ({
    label: name,
    kind: CompletionItemKind.Class,
    detail: 'Entity (relationship)',
    documentation: docs(
      `Reference to the **${name}** entity.\n\n` +
      'Creates a many-to-one relationship (foreign key).',
      `author: ${name}      -- belongs-to\ncomments: [${name}]  -- has-many`
    ),
  }));
}

function getFieldCompletions(
  docContext: DocumentContext | undefined,
  entityName: string
): CompletionItem[] {
  const fields: CompletionItem[] = [];

  fields.push(
    {
      label: 'id',
      kind: CompletionItemKind.Field,
      detail: 'Primary key (implicit)',
      documentation: docs('Auto-generated UUID primary key.\n\nAdded automatically to every entity.'),
    },
    {
      label: 'created',
      kind: CompletionItemKind.Field,
      detail: 'Creation timestamp (implicit)',
      documentation: docs('Timestamp when the record was created.\n\nSet automatically on insert.'),
    },
    {
      label: 'updated',
      kind: CompletionItemKind.Field,
      detail: 'Last update timestamp (implicit)',
      documentation: docs('Timestamp when the record was last modified.\n\nUpdated automatically on save.'),
    }
  );

  if (docContext?.entities && entityName) {
    const entity = docContext.entities.get(entityName);
    if (entity) {
      for (const fieldName of entity.fields) {
        fields.push({
          label: fieldName,
          kind: CompletionItemKind.Field,
          detail: `Field from ${entityName}`,
        });
      }
    }
  }

  return fields;
}

function getCustomActionCompletions(docContext: DocumentContext | undefined): CompletionItem[] {
  if (!docContext?.actions) return [];

  return Array.from(docContext.actions).map((name) => ({
    label: name,
    kind: CompletionItemKind.Method,
    detail: 'Custom action',
    documentation: docs(`Custom action **${name}** defined in this file.`),
  }));
}
