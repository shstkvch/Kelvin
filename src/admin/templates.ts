import { AppNode, ViewNode, ListBlockNode, CreateBlockNode, EntityNode } from '../parser/ast';

const TAILWIND_CDN = 'https://cdn.tailwindcss.com';
const ALPINE_CDN = 'https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js';

export function renderLayout(
  title: string,
  content: string,
  ast: AppNode,
  currentView?: string
): string {
  const accent = ast.config?.settings['accent'] || '#6366F1';

  const navItems = ast.views
    .map(view => {
      const isActive = view.name === currentView;
      return `
        <a href="/admin/${view.name}"
           class="block px-4 py-2 rounded-md ${isActive ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}">
          ${capitalize(view.name)}
        </a>
      `;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - ${ast.name} Admin</title>
  <script src="${TAILWIND_CDN}"></script>
  <script defer src="${ALPINE_CDN}"></script>
  <style>
    :root { --accent: ${accent}; }
    .btn-primary { background-color: var(--accent); }
    .btn-primary:hover { filter: brightness(110%); }
  </style>
</head>
<body class="bg-gray-50">
  <div class="min-h-screen flex">
    <!-- Sidebar -->
    <aside class="w-64 bg-white border-r border-gray-200 p-4">
      <div class="mb-8">
        <h1 class="text-xl font-bold text-gray-900">${ast.name}</h1>
        <p class="text-sm text-gray-500">Admin Panel</p>
      </div>
      <nav class="space-y-1">
        ${navItems}
      </nav>
      <div class="mt-8 pt-4 border-t border-gray-200">
        <a href="/admin/logout" class="text-sm text-gray-500 hover:text-gray-700">Logout</a>
      </div>
    </aside>

    <!-- Main content -->
    <main class="flex-1 p-8">
      ${content}
    </main>
  </div>
</body>
</html>`;
}

export function renderLoginPage(ast: AppNode, error?: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Login - ${ast.name} Admin</title>
  <script src="${TAILWIND_CDN}"></script>
</head>
<body class="bg-gray-50">
  <div class="min-h-screen flex items-center justify-center">
    <div class="max-w-md w-full">
      <div class="bg-white rounded-lg shadow-md p-8">
        <h1 class="text-2xl font-bold text-center mb-6">${ast.name} Admin</h1>
        ${error ? `<div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">${error}</div>` : ''}
        <form method="POST" action="/admin/login">
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" name="email" required
                   class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500">
          </div>
          <div class="mb-6">
            <label class="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input type="password" name="password" required
                   class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500">
          </div>
          <button type="submit"
                  class="w-full btn-primary text-white py-2 px-4 rounded-md font-medium">
            Login
          </button>
        </form>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export function renderListPage(
  view: ViewNode,
  block: ListBlockNode,
  entity: EntityNode,
  data: Record<string, unknown>[],
  pagination: { page: number; totalPages: number; total: number },
  ast: AppNode
): string {
  const columns = block.show.map(ref => ref.path.join('.'));

  const headerCells = columns
    .map(col => `<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${formatColumnName(col)}</th>`)
    .join('');

  const rows = data.map(row => {
    const cells = columns
      .map(col => {
        const value = getNestedValue(row, col);
        return `<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${formatValue(value)}</td>`;
      })
      .join('');

    const actions = block.actions?.map(action => {
      if (action === 'edit') {
        return `<a href="/admin/${view.name}/${toSnakeCase(block.entity)}/${row.id}/edit" class="text-indigo-600 hover:text-indigo-900 mr-3">Edit</a>`;
      }
      if (action === 'delete') {
        return `<form method="POST" action="/admin/${view.name}/${toSnakeCase(block.entity)}/${row.id}/delete" class="inline"
                      onsubmit="return confirm('Are you sure?')">
                  <button type="submit" class="text-red-600 hover:text-red-900">Delete</button>
                </form>`;
      }
      return `<form method="POST" action="/admin/${view.name}/${toSnakeCase(block.entity)}/${row.id}/${action}" class="inline">
                <button type="submit" class="text-indigo-600 hover:text-indigo-900 mr-3">${capitalize(action)}</button>
              </form>`;
    }).join('') || '';

    return `<tr class="hover:bg-gray-50">
      ${cells}
      <td class="px-6 py-4 whitespace-nowrap text-sm">${actions}</td>
    </tr>`;
  }).join('');

  // Check if there's a create block for this entity in this view
  const hasCreate = view.blocks.some(b => b.type === 'CreateBlock' && b.entity === block.entity);

  const content = `
    <div class="mb-6 flex justify-between items-center">
      <h2 class="text-2xl font-bold text-gray-900">${capitalize(block.entity)} List</h2>
      ${hasCreate ? `<a href="/admin/${view.name}/${toSnakeCase(block.entity)}/new"
         class="btn-primary text-white px-4 py-2 rounded-md">
        Create ${block.entity}
      </a>` : ''}
    </div>

    <div class="bg-white shadow rounded-lg overflow-hidden">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            ${headerCells}
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200">
          ${rows || '<tr><td colspan="100" class="px-6 py-4 text-center text-gray-500">No data</td></tr>'}
        </tbody>
      </table>
    </div>

    ${pagination.totalPages > 1 ? renderPagination(pagination, `/admin/${view.name}/${toSnakeCase(block.entity)}`) : ''}
  `;

  return renderLayout(`${capitalize(block.entity)} List`, content, ast, view.name);
}

export function renderCreatePage(
  view: ViewNode,
  block: CreateBlockNode,
  entity: EntityNode,
  ast: AppNode,
  error?: string
): string {
  const fields = block.input.map(fieldName => {
    const field = entity.fields.find(f => f.name === fieldName);
    if (!field) return '';

    return renderFormField(fieldName, field);
  }).join('');

  const content = `
    <div class="mb-6">
      <h2 class="text-2xl font-bold text-gray-900">Create ${block.entity}</h2>
    </div>

    ${error ? `<div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">${error}</div>` : ''}

    <div class="bg-white shadow rounded-lg p-6 max-w-2xl">
      <form method="POST" action="/admin/${view.name}/${toSnakeCase(block.entity)}">
        ${fields}
        <div class="flex gap-4 mt-6">
          <button type="submit" class="btn-primary text-white px-4 py-2 rounded-md">Create</button>
          <a href="/admin/${view.name}/${toSnakeCase(block.entity)}" class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">Cancel</a>
        </div>
      </form>
    </div>
  `;

  return renderLayout(`Create ${block.entity}`, content, ast, view.name);
}

export function renderEditPage(
  view: ViewNode,
  entity: EntityNode,
  data: Record<string, unknown>,
  inputFields: string[],
  ast: AppNode,
  error?: string
): string {
  const fields = inputFields.map(fieldName => {
    const field = entity.fields.find(f => f.name === fieldName);
    if (!field) return '';

    const value = data[fieldName];
    return renderFormField(fieldName, field, value);
  }).join('');

  const content = `
    <div class="mb-6">
      <h2 class="text-2xl font-bold text-gray-900">Edit ${entity.name}</h2>
    </div>

    ${error ? `<div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">${error}</div>` : ''}

    <div class="bg-white shadow rounded-lg p-6 max-w-2xl">
      <form method="POST" action="/admin/${view.name}/${toSnakeCase(entity.name)}/${data.id}">
        ${fields}
        <div class="flex gap-4 mt-6">
          <button type="submit" class="btn-primary text-white px-4 py-2 rounded-md">Save</button>
          <a href="/admin/${view.name}/${toSnakeCase(entity.name)}" class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">Cancel</a>
        </div>
      </form>
    </div>
  `;

  return renderLayout(`Edit ${entity.name}`, content, ast, view.name);
}

function renderFormField(name: string, field: any, value?: unknown): string {
  const label = formatColumnName(name);
  const required = !field.optional ? 'required' : '';

  if (field.fieldType.kind === 'bool') {
    return `
      <div class="mb-4">
        <label class="flex items-center">
          <input type="checkbox" name="${name}" ${value ? 'checked' : ''}
                 class="h-4 w-4 text-indigo-600 border-gray-300 rounded">
          <span class="ml-2 text-sm text-gray-700">${label}</span>
        </label>
      </div>
    `;
  }

  if (field.fieldType.kind === 'enum') {
    const options = field.fieldType.values.map((v: string) =>
      `<option value="${v}" ${value === v ? 'selected' : ''}>${v}</option>`
    ).join('');
    return `
      <div class="mb-4">
        <label class="block text-sm font-medium text-gray-700 mb-1">${label}</label>
        <select name="${name}" ${required}
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500">
          ${options}
        </select>
      </div>
    `;
  }

  if (field.fieldType.kind === 'text' && field.fieldType.maxLength && field.fieldType.maxLength > 500) {
    return `
      <div class="mb-4">
        <label class="block text-sm font-medium text-gray-700 mb-1">${label}</label>
        <textarea name="${name}" ${required} rows="5"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500">${value || ''}</textarea>
      </div>
    `;
  }

  const inputType = getInputType(field.fieldType.kind);
  return `
    <div class="mb-4">
      <label class="block text-sm font-medium text-gray-700 mb-1">${label}</label>
      <input type="${inputType}" name="${name}" value="${value || ''}" ${required}
             class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500">
    </div>
  `;
}

function renderPagination(pagination: { page: number; totalPages: number }, baseUrl: string): string {
  const pages = [];
  for (let i = 1; i <= pagination.totalPages; i++) {
    const isActive = i === pagination.page;
    pages.push(`
      <a href="${baseUrl}?page=${i}"
         class="px-3 py-1 ${isActive ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'} border rounded">
        ${i}
      </a>
    `);
  }

  return `
    <div class="mt-4 flex justify-center gap-1">
      ${pages.join('')}
    </div>
  `;
}

function getInputType(kind: string): string {
  switch (kind) {
    case 'email': return 'email';
    case 'phone': return 'tel';
    case 'url': return 'url';
    case 'int': return 'number';
    case 'money': return 'number';
    case 'date': return 'date';
    case 'time': return 'time';
    case 'timestamp': return 'datetime-local';
    default: return 'text';
  }
}

function formatColumnName(name: string): string {
  return name
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/\./g, ' › ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
    .trim();
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (value instanceof Date) return value.toLocaleDateString();
  return String(value);
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let value: unknown = obj;
  for (const part of parts) {
    if (value && typeof value === 'object') {
      value = (value as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return value;
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function toSnakeCase(str: string): string {
  return str
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '');
}
