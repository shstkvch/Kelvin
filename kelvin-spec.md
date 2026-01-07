# Kelvin

**A declarative language for building web applications.**

Kelvin lets you define your entire application—data models, APIs, admin interfaces, and access control—in a single file. No boilerplate, no code generation, no framework to learn.

```
app Blog {
  entity Post {
    title: text(1..200)
    body: text(1..50000)
    published: bool = false
  }
  
  view public {
    visibility: public
    
    list Post {
      show: title, created
      where: published
      order by: created desc
    }
  }
  
  view admin {
    require: role == 'admin'
    
    list Post {
      show: title, published, created
      actions: edit, delete, publish
    }
    
    action publish(post: Post) {
      then {
        post.published = true
      }
    }
  }
}
```

```bash
$ kelvin serve
Server running at http://localhost:3000
```

That's it. You have a database, REST API, and admin panel.

---

## Table of Contents

1. [Installation](#installation)
2. [Quick Start](#quick-start)
3. [CLI Reference](#cli-reference)
4. [Language Reference](#language-reference)
   - [App Structure](#app-structure)
   - [Config](#config)
   - [Entities](#entities)
   - [Views](#views)
   - [Actions](#actions)
   - [Triggers](#triggers)
5. [Authentication](#authentication)
6. [Generated API](#generated-api)
7. [Admin Interface](#admin-interface)
8. [Configuration File](#configuration-file)
9. [Deployment](#deployment)
10. [VSCode Extension](#vscode-extension)
11. [Examples](#examples)
12. [Edge Cases & Gotchas](#edge-cases--gotchas)

---

## Installation

```bash
npm install -g kelvin-lang
```

### Verify Installation

```bash
$ kelvin --version
kelvin 0.1.0
```

---

## Quick Start

### Create a New Project

```bash
$ kelvin new myapp
Created myapp/
  myapp.kelvin
  kelvin.yaml
  triggers/

$ cd myapp
```

### Edit Your App

```
# myapp.kelvin

app MyApp {
  entity Task {
    title: text(1..200)
    done: bool = false
  }
  
  view tasks {
    list Task {
      show: title, done, created
      filter by: done
      actions: edit, delete, toggle
    }
    
    create Task {
      input: title
    }
    
    action toggle(task: Task) {
      then {
        task.done = !task.done
      }
    }
  }
}
```

### Start the Server

```bash
$ kelvin serve
Connecting to database (sqlite://myapp.db)...
Running migrations...
  CREATE TABLE tasks

Server running at http://localhost:3000

  API:   http://localhost:3000/api
  Admin: http://localhost:3000/admin

Watching myapp.kelvin for changes...
```

### Use Your App

Open `http://localhost:3000/admin` in your browser. You'll see your task list, create form, and actions.

Or use the API directly:

```bash
# Create a task
$ curl -X POST http://localhost:3000/api/tasks \
    -H "Content-Type: application/json" \
    -d '{"title": "Learn Kelvin"}'

# List tasks
$ curl http://localhost:3000/api/tasks

# Toggle a task
$ curl -X POST http://localhost:3000/api/tasks/1/toggle
```

---

## MVP Status

The following features are fully implemented in the current MVP:

**Implemented:**
- **CLI:** `serve`, `check`, `migrate` commands
- **Parser:** Full language parsing with syntax error reporting
- **Semantic Analysis:** Type checking, reference validation, duplicate detection
- **Authentication:** Email/password with JWT tokens
- **REST API:** Full CRUD endpoints for entities and custom actions
- **Admin UI:** Login, list, create, edit pages
- **Entities:** All field types (text, email, int, bool, enum, date, timestamp, relationships)
- **Views:** List blocks, create blocks, visibility (public/authenticated), require conditions
- **Database:** SQLite with automatic migrations

**Planned (Not Yet Implemented):**
- CLI: `new`, `console`, `routes`, `schema` commands
- OAuth providers (Google, etc.)
- Detail blocks (parsed but not routed)
- Edit blocks (parsed but not routed)
- Triggers (parsed but not executed)
- Action inputs (extra form fields)
- Entity validations (parsed but not enforced at runtime)
- Field constraint validation at runtime
- Config options (parsed but most options unused)
- `kelvin.yaml` configuration file
- Multiple order by fields
- `generate()` UUID function
- `next_sequence()` function
- `filter by:` clause
- PostgreSQL / MySQL support

---

## CLI Reference

### `kelvin new <name>` *(Planned)*

Create a new Kelvin project.

```bash
$ kelvin new myapp
$ kelvin new myapp --database postgres
```

Options:
- `--database`: Database type (`sqlite`, `postgres`, `mysql`). Default: `sqlite`

### `kelvin serve`

Start the development server.

```bash
$ kelvin serve myapp.kelvin
$ kelvin serve myapp.kelvin --port 8080
```

**Example Output:**

```
Parsing myapp.kelvin...
  Found 2 entities, 2 views
Initializing database at myapp.db...
Running migrations...
  Migrations complete

MyApp is running!

  API:   http://localhost:3000/api
  Admin: http://localhost:3000/admin

Views:
  - dashboard (public)
  - admin (authenticated)

Watching for changes...

Press Ctrl+C to stop
```

The server watches for changes to your `.kelvin` file and automatically reloads when you save. This includes re-parsing the file, running any needed migrations, and updating the API routes.

Options:
- `--port`, `-p`: Port number. Default: `3000`
- `--db-path`: Custom database path. Default: `{app_name}.db`
- `--host`: Host to bind *(Planned)*
- `--no-watch`: Disable file watching (hot reload is enabled by default)
- `--no-admin`: Disable admin interface *(Planned)*

### `kelvin check`

Validate your `.kelvin` file without starting the server. Runs both syntax parsing and semantic analysis.

```bash
$ kelvin check myapp.kelvin
```

**Example Output (Valid):**

```
Checking myapp.kelvin...

App: MyApp

Entities:
  - User (3 fields)
  - Post (4 fields)

Views:
  - blog (public, 1 blocks)
  - admin (authenticated, 2 blocks)

No errors found.
```

**Example Output (Errors):**

```
Checking myapp.kelvin...

App: MyApp

Entities:
  - User (3 fields)
  - Post (4 fields)

Views:
  - admin (authenticated, 1 blocks)

Errors:
  [E003] Unknown entity 'Admin'
  [E010] Unknown field 'nonexistent' in entity 'Post'

Found 2 error(s).
```

### `kelvin migrate`

Run database migrations.

```bash
$ kelvin migrate myapp.kelvin
$ kelvin migrate myapp.kelvin --db-path ./data/myapp.db
```

**Example Output:**

```
Parsing myapp.kelvin...
Database: myapp.db
Running migrations...
Migrations complete.
```

Options:
- `--db-path`: Custom database path. Default: `{app_name}.db`
- `--dry-run`: Show SQL without executing *(Planned)*
- `--rollback`: Rollback last migration *(Planned)*

### `kelvin create-user`

Create an admin user interactively. Useful for setting up initial access to the admin panel.

```bash
$ kelvin create-user myapp.kelvin
```

**Example Output:**

```
Creating user for MyApp...

? Email (admin@example.com): admin@mycompany.com
? Password: ********
? Confirm password: ********
? Name (Admin): Alice Admin
? Role (admin): admin

User created successfully!

  Email: admin@mycompany.com
  Name:  Alice Admin
  Role:  admin
  ID:    a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

Default values when pressing Enter:
- Email: `admin@example.com`
- Password: (must be provided)
- Name: `Admin`
- Role: `admin` (or first enum value if 'admin' not available)

Options:
- `--db`: Custom database path. Default: `{app_name}.db`

### `kelvin one-time-login`

Generate a one-time login link for an existing user. The link expires after 15 minutes and can only be used once.

```bash
$ kelvin one-time-login myapp.kelvin admin@example.com
```

**Example Output:**

```
One-time login link generated:

  http://localhost:3000/admin/login?token=Xk9mPq2rStUvWxYzAbCdEfGhIjKlMnOpQrStUvWx

Expires in 15 minutes. This link can only be used once.
```

Options:
- `--db`: Custom database path. Default: `{app_name}.db`
- `--port`: Port for the generated URL. Default: `3000`

### `kelvin console` *(Planned)*

Interactive REPL for querying your data.

```bash
$ kelvin console
kelvin> Task.all()
[
  { id: "1", title: "Learn Kelvin", done: false, created: "2025-01-07T10:00:00Z" }
]

kelvin> Task.where(done: true).count()
0

kelvin> Task.find("1").update(done: true)
{ id: "1", title: "Learn Kelvin", done: true, ... }
```

### `kelvin routes` *(Planned)*

List all generated routes.

```bash
$ kelvin routes
METHOD  PATH                      VIEW          ACTION
GET     /api/tasks                tasks         list
POST    /api/tasks                tasks         create
GET     /api/tasks/:id            tasks         detail
PUT     /api/tasks/:id            tasks         edit
DELETE  /api/tasks/:id            tasks         delete
POST    /api/tasks/:id/toggle     tasks         toggle
```

### `kelvin schema` *(Planned)*

Output the OpenAPI schema.

```bash
$ kelvin schema > openapi.yaml
$ kelvin schema --format json > openapi.json
```

---

## Language Reference

### App Structure

Every Kelvin file contains a single `app` block that wraps everything:

```
app AppName {
  config { ... }
  
  entity EntityName { ... }
  
  view view_name { ... }
}
```

The app name is used for:
- Default database name
- Admin panel title
- API documentation title

### Syntax Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Keywords | lowercase | `entity`, `view`, `show` |
| Entity names | PascalCase | `User`, `BlogPost` |
| Field names | snake_case | `first_name`, `created_at` |
| View names | snake_case | `admin`, `my_bookings` |
| String literals | Single quotes | `'pending'`, `'admin'` |
| Comments | `--` | `-- this is a comment` |

### Operators

| Operator | Meaning | Example |
|----------|---------|---------|
| `==` | Equals | `status == 'active'` |
| `!=` | Not equals | `role != 'guest'` |
| `>` | Greater than | `price > 100` |
| `>=` | Greater than or equal | `age >= 18` |
| `<` | Less than | `stock < 10` |
| `<=` | Less than or equal | `date <= today()` |
| `in` | In list | `status in ['pending', 'active']` |
| `and` | Logical AND | `active and published` |
| `or` | Logical OR | `admin or moderator` |
| `not` | Logical NOT | `not archived` |
| `!` | Boolean negation | `task.done = !task.done` |

---

### Config *(Partially Implemented)*

> **Note:** Config is parsed but most options are not yet applied in the MVP.

The optional `config` block sets application-wide defaults:

```
app MyApp {
  config {
    accent: '#3B82F6'
    currency: 'GBP'
    date_format: 'DD/MM/YYYY'
    timezone: 'Europe/London'
    pagination: 25
  }
  
  ...
}
```

| Option | Description | Default |
|--------|-------------|---------|
| `accent` | Primary UI colour (hex) | `'#3B82F6'` |
| `currency` | Default currency code | `'USD'` |
| `date_format` | Date display format | `'YYYY-MM-DD'` |
| `time_format` | Time display format | `'HH:mm'` |
| `timezone` | Default timezone | `'UTC'` |
| `pagination` | Items per page | `20` |

---

### Entities

Entities define your data models. Each entity becomes a database table.

```
entity EntityName {
  field_name: type(constraints)
  field_name: type?                   -- optional (nullable)
  field_name: type = default          -- with default value
  
  validate condition
}
```

#### Field Types

**Text Types**

```
name: text(1..100)        -- required, 1-100 characters
bio: text(0..5000)?       -- optional, up to 5000 characters  
code: text(6..6)          -- exactly 6 characters
```

| Type | DB Type | HTML Input | Validation |
|------|---------|------------|------------|
| `text(min..max)` | VARCHAR(max) | `<input type="text">` | Length bounds |
| `text(..max)` | VARCHAR(max) | `<input type="text">` | Max length |
| `email` | VARCHAR(254) | `<input type="email">` | Email format |
| `phone` | VARCHAR(20) | `<input type="tel">` | Phone format |
| `url` | VARCHAR(2048) | `<input type="url">` | URL format |

**Numeric Types**

```
age: int(0..150)          -- integer with range
price: money              -- decimal currency
quantity: int(1..)        -- minimum 1, no maximum
rating: int(1..5)         -- 1 to 5
```

| Type | DB Type | HTML Input | Validation |
|------|---------|------------|------------|
| `int(min..max)` | INTEGER | `<input type="number">` | Range bounds |
| `int(min..)` | INTEGER | `<input type="number">` | Minimum only |
| `int(..max)` | INTEGER | `<input type="number">` | Maximum only |
| `money` | DECIMAL(19,4) | `<input type="number" step="0.01">` | 2 decimal places |

**Date/Time Types**

```
birthday: date
start_time: time
created: timestamp = now()
```

| Type | DB Type | HTML Input |
|------|---------|------------|
| `date` | DATE | `<input type="date">` |
| `time` | TIME | `<input type="time">` |
| `timestamp` | TIMESTAMP | `<input type="datetime-local">` |

**Other Types**

```
active: bool = true
status: enum('draft', 'published', 'archived')
website: url?
```

| Type | DB Type | HTML Input |
|------|---------|------------|
| `bool` | BOOLEAN | `<input type="checkbox">` |
| `enum('a', 'b', 'c')` | VARCHAR | `<select>` |
| `uuid` | UUID | (auto-generated) |

#### Relationships

**Belongs-to (many-to-one)**

```
entity Post {
  author: User              -- foreign key to User
  category: Category?       -- optional relationship
}
```

This creates a `author_id` column in the `posts` table.

**Has-many (one-to-many)**

```
entity User {
  posts: [Post]             -- inferred from Post.author
  comments: [Comment] via author   -- explicit inverse
}
```

Has-many doesn't create columns—it's the inverse of a belongs-to.

**Many-to-many**

Use a join entity:

```
entity Article {
  title: text(1..200)
}

entity Tag {
  name: text(1..50)
}

entity ArticleTag {
  article: Article
  tag: Tag
}
```

#### Implicit Fields

Every entity automatically has these fields:

| Field | Type | Description |
|-------|------|-------------|
| `id` | uuid | Primary key, auto-generated |
| `created` | timestamp | Set on insert |
| `updated` | timestamp | Set on every save |

You can reference them but not override them:

```
list Post {
  show: title, created      -- ✓ can reference
  order by: created desc    -- ✓ can sort by
}
```

#### Optional Fields

Add `?` to make a field nullable:

```
entity User {
  name: text(1..100)        -- required
  phone: phone?             -- optional
  bio: text(0..1000)?       -- optional
}
```

#### Default Values

Use `=` to set defaults:

```
entity Post {
  status: enum('draft', 'published') = 'draft'
  views: int(0..) = 0
  created: timestamp = now()
}
```

Available default functions:
- `now()` — current timestamp
- `today()` — current date
- `generate()` — new UUID

#### Validation

Add `validate` rules for cross-field validation:

```
entity Event {
  start_date: date
  end_date: date
  
  validate end_date >= start_date
}

entity Booking {
  tickets: int(1..10)
  
  validate tickets <= event.capacity
}
```

Validation runs before insert and update. Failed validation returns a 422 error with details.

---

### Views

Views define what users can see and do. Each view becomes a set of API endpoints and admin pages.

```
view view_name {
  visibility: public | authenticated
  
  require: condition
  -- or --
  require {
    condition
    condition
  }
  
  list Entity { ... }
  detail Entity { ... }
  create Entity { ... }
  edit Entity { ... }
  action name(param: Entity) { ... }
}
```

#### Visibility

```
view public_site {
  visibility: public          -- anyone can access
  ...
}

view dashboard {
  visibility: authenticated   -- must be logged in
  ...
}

view admin {
  -- visibility: authenticated is the default
  ...
}
```

| Value | Meaning |
|-------|---------|
| `public` | No authentication required |
| `authenticated` | User must be logged in |
| (omitted) | Same as `authenticated` |

**Design decision:** Secure by default. If you forget to add `visibility: public`, the view requires authentication.

#### Require Blocks

Add conditions beyond authentication:

```
-- Single condition (inline)
view admin require role == 'admin' {
  ...
}

-- Multiple conditions (block)
view moderator {
  require {
    role in ['admin', 'moderator']
    reputation >= 100
  }
  
  ...
}
```

Conditions are AND-ed together. All must pass.

#### List

Display a table of entities:

```
list Entity {
  show: field1, field2, relation.field
  where: condition
  order by: field asc|desc
  filter by: field
  actions: action1, action2
}
```

**Clause order is enforced:**
1. `show` — columns to display
2. `where` — filter rows (hard constraint)
3. `order by` — sort order
4. `filter by` — UI filters
5. `actions` — row actions

**Show**

```
show: title, author.name, created      -- specific fields
show: *                                 -- all fields
show: user.email, user.profile.avatar  -- nested traversal
```

**Where**

Hard filter—users cannot override:

```
-- Inline
list Post {
  show: title, created
  where: published
}

-- Block (multiple conditions)
list Post {
  show: title, created
  where {
    published
    created >= '2024-01-01'
  }
}
```

**Order By**

```
order by: created desc                 -- single field
order by: priority asc, created desc   -- multiple fields
```

**Filter By** *(Planned)*

> **Note:** Filter by is parsed but UI filters are not yet implemented in the MVP.

User-controllable filters in the UI:

```
filter by: status          -- dropdown for enum
filter by: category        -- dropdown for relationship
filter by: created         -- date picker
filter by: active          -- checkbox for bool
filter by: title           -- search box for text
```

The filter type is inferred from the field type.

**Actions**

```
actions: edit, delete                  -- built-in actions
actions: approve, reject, archive      -- custom actions
```

#### Detail *(Planned)*

> **Note:** Detail blocks are parsed but API endpoints are not yet generated in the MVP.

Display a single entity:

```
detail Entity as binding {
  show: field1, field2
  where: condition
  
  -- nested lists
  list RelatedEntity {
    ...
  }
}
```

The `as` clause binds the entity to a name for use in nested blocks:

```
detail Post as post {
  show: title, body, author.name
  
  list Comment {
    show: body, author.name, created
    where: post == post
    order by: created asc
  }
}
```

#### Create

Define a form for creating entities:

```
create Entity as binding {
  input: field1, field2, field3
  
  then {
    binding.field = value
  }
}
```

**Input**

Fields the user fills in:

```
create Post as post {
  input: title, body, category
  
  then {
    post.author = current_user
    post.status = 'draft'
  }
}
```

**Then**

System-set values after user input:

```
create Booking as booking {
  input: event, tickets
  
  then {
    booking.user = current_user
    booking.total = booking.tickets * booking.event.price
    booking.status = 'pending'
    trigger('process_booking', booking)
  }
}
```

#### Edit *(Planned)*

> **Note:** Edit blocks are parsed but dedicated edit pages are not yet generated in the MVP. Basic edit functionality works through the built-in `edit` action.

Define a form for editing entities:

```
edit Entity as binding {
  require: condition
  input: field1, field2
}
```

Example:

```
edit Post as post {
  require: post.author == current_user or role == 'admin'
  input: title, body, category
}
```

If you reference `actions: edit` without defining an `edit` block, a default one is generated with all editable fields.

---

### Actions

Actions are operations on entities.

#### Built-in Actions

These work without definition:

- `edit` — links to edit form
- `delete` — deletes the entity

#### Custom Actions

```
action action_name(param: Entity) {
  require: condition
  -- or --
  require {
    condition
    condition
  }
  
  then {
    statements
  }
}
```

**Example: State Transitions**

```
action publish(post: Post) {
  require: post.status == 'draft'
  
  then {
    post.status = 'published'
    post.published_at = now()
  }
}

action archive(post: Post) {
  require: post.status in ['draft', 'published']
  
  then {
    post.status = 'archived'
  }
}
```

**Example: Toggle**

```
action toggle(task: Task) {
  then {
    task.done = !task.done
  }
}
```

**Example: With Trigger**

```
action approve(application: Application) {
  require {
    application.status == 'pending'
    role == 'admin'
  }
  
  then {
    application.status = 'approved'
    application.approved_by = current_user
    application.approved_at = now()
    trigger('send_approval_email', application)
  }
}
```

#### Overriding Built-in Actions

Define an action with the same name to override:

```
action delete(post: Post) {
  require: post.author == current_user or role == 'admin'
  
  then {
    post.status = 'deleted'    -- soft delete instead
    post.deleted_at = now()
  }
}
```

---

### Triggers *(Planned)*

> **Note:** Triggers are parsed but execution is not yet implemented in the MVP.

Triggers are the escape hatch for custom logic. They call external code when something happens.

```
trigger('trigger_name', entity)
```

**In the DSL:**

```
action confirm(booking: Booking) {
  then {
    booking.status = 'confirmed'
    trigger('send_confirmation', booking)
    trigger('charge_payment', booking)
  }
}
```

**Implementation:**

Triggers are defined in the `triggers/` directory:

```javascript
// triggers/send_confirmation.js

export default async function(booking, { email }) {
  await email.send({
    to: booking.customer.email,
    subject: 'Booking Confirmed',
    template: 'booking_confirmed',
    data: {
      name: booking.customer.name,
      event: booking.event.title,
      date: booking.date,
      tickets: booking.tickets,
    }
  });
}
```

```javascript
// triggers/charge_payment.js

export default async function(booking, { http, db }) {
  const response = await http.post('https://payments.example.com/charge', {
    amount: booking.total,
    currency: 'GBP',
    customer_email: booking.customer.email,
  });
  
  await db.update('bookings', booking.id, {
    payment_id: response.payment_id,
  });
}
```

**Trigger Context**

Triggers receive these utilities:

| Utility | Description |
|---------|-------------|
| `db` | Database queries and updates |
| `email` | Send emails |
| `http` | Make HTTP requests |
| `log` | Structured logging |
| `env` | Environment variables |

**Webhook Triggers**

Instead of code, triggers can call webhooks:

```yaml
# kelvin.yaml

triggers:
  send_confirmation: https://hooks.example.com/confirmation
  charge_payment: https://hooks.example.com/payment
```

The interpreter POSTs the entity data to the URL.

---

## Authentication

Kelvin includes built-in authentication.

> **Note:** The MVP implements email/password authentication with JWT tokens. OAuth providers are planned for a future release.

### User Entity

Define a `User` entity with an `email` field to enable authentication:

```
entity User {
  email: email
  name: text(1..100)
  role: enum('user', 'admin') = 'user'
}
```

The `email` field is used for login. Passwords are handled automatically (hashed, never exposed).

### Auth Routes

These routes are auto-generated:

| Route | Method | Description |
|-------|--------|-------------|
| `/auth/register` | POST | Create account |
| `/auth/login` | POST | Get access token |
| `/auth/logout` | POST | Invalidate token |
| `/auth/me` | GET | Current user |

### Context Variables

In authenticated views, these are available:

| Variable | Description |
|----------|-------------|
| `current_user` | The logged-in User entity |
| `role` | Shorthand for `current_user.role` |
| `authenticated` | Boolean, true if logged in |

### Examples

```
view my_posts {
  list Post {
    show: title, status, created
    where: author == current_user      -- only my posts
    actions: edit, delete
  }
}

view admin {
  require: role == 'admin'             -- must be admin
  
  list User {
    show: name, email, role
    actions: edit, delete
  }
}

view moderator {
  require {
    role in ['admin', 'moderator']
    current_user.reputation >= 100
  }
  
  ...
}
```

---

## Generated API

Every view generates REST endpoints.

### List Endpoints

```
GET /api/{view}/{entity}
```

**Query Parameters:**

| Parameter | Description | Example |
|-----------|-------------|---------|
| `page` | Page number | `?page=2` |
| `per_page` | Items per page | `?per_page=50` |
| `sort` | Sort field | `?sort=created` |
| `order` | Sort direction | `?order=desc` |
| `{filter}` | Filter by field | `?status=published` |

**Response:**

```json
{
  "data": [
    { "id": "1", "title": "Hello", "created": "2025-01-07T10:00:00Z" },
    { "id": "2", "title": "World", "created": "2025-01-07T11:00:00Z" }
  ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 42,
    "total_pages": 3
  }
}
```

### Detail Endpoints

```
GET /api/{view}/{entity}/{id}
```

**Response:**

```json
{
  "data": {
    "id": "1",
    "title": "Hello",
    "body": "World",
    "author": {
      "id": "5",
      "name": "Alice"
    },
    "created": "2025-01-07T10:00:00Z"
  }
}
```

### Create Endpoints

```
POST /api/{view}/{entity}
```

**Request:**

```json
{
  "title": "New Post",
  "body": "Content here"
}
```

**Response:**

```json
{
  "data": {
    "id": "3",
    "title": "New Post",
    "body": "Content here",
    "created": "2025-01-07T12:00:00Z"
  }
}
```

### Update Endpoints

```
PUT /api/{view}/{entity}/{id}
```

### Delete Endpoints

```
DELETE /api/{view}/{entity}/{id}
```

### Action Endpoints

```
POST /api/{view}/{entity}/{id}/{action}
```

**Example:**

```bash
POST /api/admin/posts/1/publish
```

### OpenAPI Schema

Generate a full OpenAPI spec:

```bash
$ kelvin schema > openapi.yaml
```

---

## Admin Interface

Kelvin generates an admin interface at `/admin`.

### Features

- **List pages**: Tables with sorting, filtering, pagination
- **Detail pages**: View single entities with related data
- **Create forms**: Generated from `create` blocks
- **Edit forms**: Generated from `edit` blocks
- **Actions**: Buttons that trigger actions

### Customisation

The admin interface follows your DSL exactly:
- Only fields in `show:` appear in tables
- Only fields in `input:` appear in forms
- Only actions in `actions:` appear as buttons
- `require:` blocks control access

### Theming

Set the accent colour in config:

```
config {
  accent: '#10B981'
}
```

---

## Configuration File *(Planned)*

> **Note:** The `kelvin.yaml` configuration file is not yet implemented. Currently, configuration is passed via CLI arguments.

The `kelvin.yaml` file configures the runtime:

```yaml
# kelvin.yaml

# Database connection
database:
  # SQLite (default)
  url: sqlite://myapp.db
  
  # PostgreSQL
  # url: postgres://user:pass@localhost:5432/myapp
  
  # MySQL
  # url: mysql://user:pass@localhost:3306/myapp

# Server settings
server:
  port: 3000
  host: localhost

# Authentication
auth:
  secret: ${AUTH_SECRET}    # JWT secret (use env var)
  expires: 7d               # Token expiration
  
  # OAuth providers (optional)
  providers:
    google:
      client_id: ${GOOGLE_CLIENT_ID}
      client_secret: ${GOOGLE_CLIENT_SECRET}

# Trigger configuration  
triggers:
  runtime: node             # node | python | webhook
  
  # Or use webhooks
  # send_confirmation: https://hooks.example.com/confirm

# Email (for triggers)
email:
  provider: smtp
  host: smtp.example.com
  port: 587
  user: ${SMTP_USER}
  pass: ${SMTP_PASS}

# Logging
log:
  level: info               # debug | info | warn | error
  format: pretty            # pretty | json
```

### Environment Variables

Use `${VAR_NAME}` to reference environment variables:

```yaml
database:
  url: ${DATABASE_URL}

auth:
  secret: ${AUTH_SECRET}
```

Create a `.env` file for local development:

```bash
# .env
DATABASE_URL=postgres://localhost:5432/myapp
AUTH_SECRET=your-secret-key-here
```

---

## Deployment

### Docker

```dockerfile
FROM kelvin-lang/kelvin:latest

COPY myapp.kelvin .
COPY kelvin.yaml .
COPY triggers/ triggers/

EXPOSE 3000

CMD ["kelvin", "serve", "--host", "0.0.0.0"]
```

```bash
$ docker build -t myapp .
$ docker run -p 3000:3000 -e DATABASE_URL=postgres://... myapp
```

### Fly.io

```bash
$ fly launch
$ fly secrets set DATABASE_URL=postgres://...
$ fly secrets set AUTH_SECRET=...
$ fly deploy
```

### Railway

Connect your repo and set environment variables. Kelvin auto-detects and runs.

### Render

Use the Docker deployment or add a build command:

```yaml
# render.yaml
services:
  - type: web
    name: myapp
    runtime: docker
    envVars:
      - key: DATABASE_URL
        fromDatabase:
          name: myapp-db
          property: connectionString
```

---

## VSCode Extension

The Kelvin VSCode extension provides:

- Syntax highlighting
- Error checking
- Autocomplete
- Go to definition
- Hover documentation

### Installation

Search for "Kelvin" in the VSCode extensions marketplace, or:

```bash
code --install-extension kelvin-lang.kelvin-vscode
```

### TextMate Grammar

For other editors, use the TextMate grammar:

```json
{
  "name": "Kelvin",
  "scopeName": "source.kelvin",
  "fileTypes": ["kelvin"],
  "patterns": [
    {
      "name": "keyword.control.kelvin",
      "match": "\\b(app|entity|view|config|list|detail|create|edit|action|trigger|require|visibility|show|where|order by|filter by|actions|input|then|validate|and|or|not|in|as|via)\\b"
    },
    {
      "name": "storage.type.kelvin",
      "match": "\\b(text|email|phone|url|int|money|bool|date|time|timestamp|enum|uuid)\\b"
    },
    {
      "name": "constant.language.kelvin",
      "match": "\\b(true|false|null|public|authenticated|asc|desc|now|today|current_user|role)\\b"
    },
    {
      "name": "string.quoted.single.kelvin",
      "begin": "'",
      "end": "'"
    },
    {
      "name": "comment.line.kelvin",
      "match": "--.*$"
    },
    {
      "name": "constant.numeric.kelvin",
      "match": "\\b[0-9]+\\b"
    },
    {
      "name": "entity.name.type.kelvin",
      "match": "\\b[A-Z][a-zA-Z0-9]*\\b"
    },
    {
      "name": "variable.other.kelvin",
      "match": "\\b[a-z][a-z0-9_]*\\b"
    },
    {
      "name": "keyword.operator.kelvin",
      "match": "(==|!=|>=|<=|>|<|=|!)"
    }
  ]
}
```

### File Association

```json
// .vscode/settings.json
{
  "files.associations": {
    "*.kelvin": "kelvin"
  }
}
```

### IntelliSense Specification

The editor provides context-aware completions based on cursor position. This section documents what completions appear in each context, serving as a reference when the language evolves.

#### Completion Contexts

| Context | Location | Completions |
|---------|----------|-------------|
| `app_body` | Inside `app {}` | `config`, `entity`, `view` |
| `entity_body` | Inside `entity {}` | Field definitions |
| `field_type` | After `field_name:` in entity | Field types + entity names |
| `view_body` | Inside `view {}` | `visibility`, `require`, `list`, `detail`, `create`, `edit`, `action` |
| `view_property` | After `visibility:` | `public`, `authenticated` |
| `list_clause` | Inside `list Entity {}` | `show`, `where`, `order by`, `filter by`, `actions` |
| `detail_clause` | Inside `detail Entity {}` | `show`, `where` |
| `create_clause` | Inside `create Entity {}` | `input`, `then` |
| `edit_clause` | Inside `edit Entity {}` | `require`, `input`, `then` |
| `action_clause` | Inside `action {}` | `require`, `then` |
| `show_fields` | After `show:` | Entity fields + `*` |
| `input_fields` | After `input:` | Entity fields (excluding `id`, `created`, `updated`) |
| `actions_list` | After `actions:` | `edit`, `delete` + custom actions |
| `order_by` | After `order by:` | Entity fields |
| `order_direction` | After `order by: field` | `asc`, `desc` |
| `filter_by` | After `filter by:` | Entity fields |
| `expression` | In `where:`, `require:`, `then {}` | Fields, operators, functions, context vars |

#### Completion Items

**Field Types:**

| Type | Snippet | Description |
|------|---------|-------------|
| `text` | `text(${1:1}..${2:100})` | String with length constraints |
| `email` | `email` | Email with validation |
| `phone` | `phone` | Phone number |
| `url` | `url` | URL with validation |
| `int` | `int(${1:0}..${2:})` | Integer with range |
| `money` | `money` | Decimal currency |
| `bool` | `bool` | Boolean |
| `date` | `date` | Date (YYYY-MM-DD) |
| `time` | `time` | Time (HH:MM) |
| `timestamp` | `timestamp` | Date and time |
| `enum` | `enum('${1:val1}', '${2:val2}')` | Enumeration |
| `uuid` | `uuid` | Unique identifier |

**View Visibility:**

| Value | Description |
|-------|-------------|
| `public` | No authentication required |
| `authenticated` | User must be logged in (default) |

**Block Keywords:**

| Keyword | Description |
|---------|-------------|
| `list` | Display multiple records |
| `detail` | Display single record |
| `create` | Create new records |
| `edit` | Update existing records |
| `action` | Custom action |

**Clause Keywords:**

| Keyword | Used In | Description |
|---------|---------|-------------|
| `show` | list, detail | Fields to display |
| `where` | list, detail | Filter condition |
| `order by` | list | Sort order |
| `filter by` | list | UI filter fields |
| `actions` | list | Available actions |
| `input` | create, edit | Editable fields |
| `then` | create, edit, action | Post-save logic |
| `require` | view, edit, action | Access control |

**Expression Operators:**

| Operator | Description |
|----------|-------------|
| `and` | Logical AND |
| `or` | Logical OR |
| `not` | Logical NOT |
| `in` | List membership |
| `==` | Equals |
| `!=` | Not equals |
| `>` | Greater than |
| `>=` | Greater or equal |
| `<` | Less than |
| `<=` | Less or equal |

**Built-in Functions:**

| Function | Returns | Description |
|----------|---------|-------------|
| `now()` | timestamp | Current date and time |
| `today()` | date | Current date |
| `generate()` | uuid | New UUID |
| `days_ago(n)` | date | Date n days in the past |
| `days_from_now(n)` | date | Date n days in the future |
| `next_sequence(entity)` | int | Next sequence number |
| `trigger(name, entity)` | void | Fire a trigger |

**Context Variables:**

| Variable | Description |
|----------|-------------|
| `current_user` | The logged-in User entity |
| `role` | Shorthand for `current_user.role` |

**Built-in Actions:**

| Action | Description |
|--------|-------------|
| `edit` | Navigate to edit form |
| `delete` | Delete the entity |

**Order Direction:**

| Value | Description |
|-------|-------------|
| `asc` | Ascending order |
| `desc` | Descending order |

**Literals:**

| Literal | Description |
|---------|-------------|
| `true` | Boolean true |
| `false` | Boolean false |
| `null` | Null value |

#### Trigger Characters

Completions are triggered by:
- `:` - After field names, clause keywords
- `.` - After entity references for field access
- ` ` (space) - After keywords

---

## Examples

### Blog

```
app Blog {
  config {
    accent: '#6366F1'
  }
  
  entity User {
    email: email
    name: text(1..100)
    bio: text(0..500)?
    role: enum('author', 'editor', 'admin') = 'author'
  }
  
  entity Category {
    name: text(1..50)
    slug: text(1..50)
  }
  
  entity Post {
    title: text(1..200)
    slug: text(1..200)
    excerpt: text(0..500)?
    body: text(1..100000)
    author: User
    category: Category?
    status: enum('draft', 'review', 'published', 'archived') = 'draft'
    published_at: timestamp?
  }
  
  entity Comment {
    post: Post
    author: User
    body: text(1..2000)
    approved: bool = false
  }
  
  -- Public blog
  view blog {
    visibility: public
    
    list Post {
      show: title, excerpt, author.name, category.name, published_at
      where: status == 'published'
      order by: published_at desc
      filter by: category
    }
    
    detail Post as post {
      show: title, body, author.name, category.name, published_at
      where: status == 'published'
      
      list Comment {
        show: body, author.name, created
        where: post == post and approved
        order by: created asc
      }
    }
  }
  
  -- Author dashboard
  view author {
    list Post {
      show: title, status, created
      where: author == current_user
      order by: updated desc
      filter by: status
      actions: edit, delete, submit
    }
    
    create Post as post {
      input: title, slug, excerpt, body, category
      
      then {
        post.author = current_user
        post.status = 'draft'
      }
    }
    
    edit Post as post {
      require: post.author == current_user
      input: title, slug, excerpt, body, category
    }
    
    action submit(post: Post) {
      require {
        post.author == current_user
        post.status == 'draft'
      }
      
      then {
        post.status = 'review'
      }
    }
  }
  
  -- Editor workflow  
  view editor {
    require: role in ['editor', 'admin']
    
    list Post {
      show: title, author.name, status, updated
      where: status == 'review'
      order by: updated asc
      actions: approve, reject
    }
    
    action approve(post: Post) {
      require: post.status == 'review'
      
      then {
        post.status = 'published'
        post.published_at = now()
        trigger('notify_author', post)
      }
    }
    
    action reject(post: Post) {
      require: post.status == 'review'
      
      then {
        post.status = 'draft'
        trigger('notify_rejection', post)
      }
    }
    
    list Comment {
      show: body, post.title, author.name, approved
      where: approved == false
      actions: approve_comment, delete
    }
    
    action approve_comment(comment: Comment) {
      then {
        comment.approved = true
      }
    }
  }
  
  -- Admin panel
  view admin {
    require: role == 'admin'
    
    list User {
      show: name, email, role, created
      filter by: role
      actions: edit, delete
    }
    
    create User {
      input: email, name, role
    }
    
    list Category {
      show: name, slug
      actions: edit, delete
    }
    
    create Category {
      input: name, slug
    }
    
    list Post {
      show: title, author.name, status, published_at
      filter by: status
      filter by: author
      filter by: category
      actions: edit, delete
    }
  }
}
```

### Issue Tracker

```
app Issues {
  config {
    accent: '#EF4444'
  }
  
  entity User {
    email: email
    name: text(1..100)
    role: enum('reporter', 'developer', 'manager', 'admin') = 'reporter'
  }
  
  entity Project {
    name: text(1..100)
    key: text(2..10)
    description: text(0..2000)?
    lead: User
    active: bool = true
  }
  
  entity Issue {
    project: Project
    key: text(1..20)
    title: text(1..200)
    description: text(0..10000)?
    reporter: User
    assignee: User?
    type: enum('bug', 'feature', 'task', 'improvement') = 'task'
    priority: enum('low', 'medium', 'high', 'critical') = 'medium'
    status: enum('open', 'in_progress', 'review', 'resolved', 'closed') = 'open'
    resolution: enum('fixed', 'wontfix', 'duplicate', 'invalid')?
    resolved_at: timestamp?
  }
  
  entity Comment {
    issue: Issue
    author: User
    body: text(1..5000)
  }
  
  -- Public issue list (read-only)
  view public_issues {
    visibility: public
    
    list Issue {
      show: key, title, type, priority, status, assignee.name
      where: project.active
      order by: created desc
      filter by: project
      filter by: type
      filter by: priority
      filter by: status
    }
    
    detail Issue as issue {
      show: key, title, description, type, priority, status, reporter.name, assignee.name, created
      
      list Comment {
        show: body, author.name, created
        where: issue == issue
        order by: created asc
      }
    }
  }
  
  -- Reporter view (create issues)
  view reporter {
    list Issue {
      show: key, title, status, created
      where: reporter == current_user
      order by: created desc
      filter by: status
    }
    
    create Issue as issue {
      input: project, title, description, type, priority
      
      then {
        issue.reporter = current_user
        issue.key = issue.project.key + '-' + next_sequence(issue.project)
        issue.status = 'open'
      }
    }
    
    detail Issue as issue {
      show: key, title, description, type, priority, status, assignee.name
      where: reporter == current_user
      
      list Comment {
        show: body, author.name, created
        where: issue == issue
        order by: created asc
      }
      
      create Comment as comment {
        input: body
        
        then {
          comment.issue = issue
          comment.author = current_user
        }
      }
    }
  }
  
  -- Developer view
  view developer {
    require: role in ['developer', 'manager', 'admin']
    
    list Issue {
      show: key, title, type, priority, status, reporter.name
      where: assignee == current_user
      order by: priority desc, created asc
      filter by: status
      filter by: type
      actions: start, complete, close
    }
    
    action start(issue: Issue) {
      require: issue.status == 'open'
      
      then {
        issue.status = 'in_progress'
        issue.assignee = current_user
      }
    }
    
    action complete(issue: Issue) {
      require: issue.status == 'in_progress'
      
      then {
        issue.status = 'review'
      }
    }
    
    action close(issue: Issue) {
      require: issue.status == 'review'
      
      then {
        issue.status = 'closed'
        issue.resolution = 'fixed'
        issue.resolved_at = now()
      }
    }
  }
  
  -- Manager view
  view manager {
    require: role in ['manager', 'admin']
    
    list Issue {
      show: key, title, type, priority, status, assignee.name
      filter by: project
      filter by: assignee
      filter by: status
      filter by: priority
      order by: priority desc, created asc
      actions: assign, edit
    }
    
    action assign(issue: Issue) {
      require: issue.status in ['open', 'in_progress']
      input: assignee
      
      then {
        issue.assignee = assignee
      }
    }
    
    list Project {
      show: name, key, lead.name, active
      filter by: active
      actions: edit
    }
    
    create Project as project {
      input: name, key, description, lead
      
      then {
        project.active = true
      }
    }
  }
  
  -- Admin
  view admin {
    require: role == 'admin'
    
    list User {
      show: name, email, role
      filter by: role
      actions: edit, delete
    }
    
    create User {
      input: email, name, role
    }
  }
}
```

### Inventory Management

```
app Inventory {
  config {
    currency: 'GBP'
  }
  
  entity User {
    email: email
    name: text(1..100)
    role: enum('viewer', 'operator', 'manager', 'admin') = 'viewer'
  }
  
  entity Supplier {
    name: text(1..200)
    contact_email: email?
    contact_phone: phone?
    address: text(0..500)?
    active: bool = true
  }
  
  entity Category {
    name: text(1..100)
    parent: Category?
  }
  
  entity Product {
    sku: text(1..50)
    name: text(1..200)
    description: text(0..2000)?
    category: Category?
    supplier: Supplier?
    cost_price: money
    sell_price: money
    stock_quantity: int(0..) = 0
    reorder_level: int(0..) = 10
    active: bool = true
  }
  
  entity StockMovement {
    product: Product
    quantity: int(..)           -- can be negative
    type: enum('receipt', 'sale', 'adjustment', 'return')
    reference: text(0..100)?
    performed_by: User
    notes: text(0..500)?
  }
  
  entity PurchaseOrder {
    supplier: Supplier
    status: enum('draft', 'submitted', 'received', 'cancelled') = 'draft'
    submitted_at: timestamp?
    received_at: timestamp?
    created_by: User
  }
  
  entity PurchaseOrderLine {
    order: PurchaseOrder
    product: Product
    quantity: int(1..)
    unit_cost: money
  }
  
  -- Dashboard
  view dashboard {
    require: role in ['viewer', 'operator', 'manager', 'admin']
    
    list Product {
      show: sku, name, category.name, stock_quantity, reorder_level
      where: active
      filter by: category
      filter by: supplier
      order by: name asc
    }
    
    -- Low stock alert
    list Product {
      show: sku, name, stock_quantity, reorder_level, supplier.name
      where: active and stock_quantity <= reorder_level
      order by: stock_quantity asc
    }
  }
  
  -- Stock operations
  view stock {
    require: role in ['operator', 'manager', 'admin']
    
    list Product {
      show: sku, name, stock_quantity
      where: active
      filter by: category
      actions: receive, adjust
    }
    
    action receive(product: Product) {
      input: quantity, reference, notes
      require: quantity > 0
      
      then {
        product.stock_quantity = product.stock_quantity + quantity
        create StockMovement {
          product = product
          quantity = quantity
          type = 'receipt'
          reference = reference
          notes = notes
          performed_by = current_user
        }
      }
    }
    
    action adjust(product: Product) {
      input: quantity, notes
      
      then {
        product.stock_quantity = product.stock_quantity + quantity
        create StockMovement {
          product = product
          quantity = quantity
          type = 'adjustment'
          notes = notes
          performed_by = current_user
        }
      }
    }
    
    list StockMovement {
      show: product.sku, product.name, quantity, type, reference, performed_by.name, created
      filter by: type
      filter by: product
      order by: created desc
    }
  }
  
  -- Purchasing
  view purchasing {
    require: role in ['manager', 'admin']
    
    list PurchaseOrder {
      show: supplier.name, status, created_by.name, created
      filter by: status
      filter by: supplier
      order by: created desc
      actions: edit, submit, receive, cancel
    }
    
    create PurchaseOrder as po {
      input: supplier
      
      then {
        po.created_by = current_user
        po.status = 'draft'
      }
    }
    
    detail PurchaseOrder as po {
      show: supplier.name, status, created_by.name, submitted_at, received_at
      
      list PurchaseOrderLine {
        show: product.sku, product.name, quantity, unit_cost
        where: order == po
        actions: delete
      }
      
      create PurchaseOrderLine as line {
        require: po.status == 'draft'
        input: product, quantity, unit_cost
        
        then {
          line.order = po
        }
      }
    }
    
    action submit(po: PurchaseOrder) {
      require: po.status == 'draft'
      
      then {
        po.status = 'submitted'
        po.submitted_at = now()
        trigger('send_po_to_supplier', po)
      }
    }
    
    action receive(po: PurchaseOrder) {
      require: po.status == 'submitted'
      
      then {
        po.status = 'received'
        po.received_at = now()
        trigger('process_po_receipt', po)
      }
    }
    
    action cancel(po: PurchaseOrder) {
      require: po.status in ['draft', 'submitted']
      
      then {
        po.status = 'cancelled'
      }
    }
  }
  
  -- Product management
  view products {
    require: role in ['manager', 'admin']
    
    list Product {
      show: sku, name, category.name, cost_price, sell_price, stock_quantity, active
      filter by: category
      filter by: supplier
      filter by: active
      actions: edit, delete
    }
    
    create Product {
      input: sku, name, description, category, supplier, cost_price, sell_price, reorder_level
    }
    
    edit Product {
      input: sku, name, description, category, supplier, cost_price, sell_price, reorder_level, active
    }
    
    list Category {
      show: name, parent.name
      actions: edit, delete
    }
    
    create Category {
      input: name, parent
    }
    
    list Supplier {
      show: name, contact_email, active
      filter by: active
      actions: edit
    }
    
    create Supplier {
      input: name, contact_email, contact_phone, address
    }
  }
  
  -- Admin
  view admin {
    require: role == 'admin'
    
    list User {
      show: name, email, role
      filter by: role
      actions: edit, delete
    }
    
    create User {
      input: email, name, role
    }
  }
}
```

---

## Edge Cases & Gotchas

### Nullable Field Traversal

You cannot traverse a nullable relationship without handling null:

```
entity Post {
  author: User?    -- optional
}

-- ERROR: author might be null
list Post {
  show: title, author.name
}

-- OK: use ?. for safe traversal
list Post {
  show: title, author?.name
}

-- OK: provide fallback
list Post {
  show: title, author?.name or 'Anonymous'
}

-- OK: filter out nulls
list Post {
  show: title, author.name
  where: author != null
}
```

### Circular References

Entities can reference each other:

```
entity User {
  manager: User?              -- self-reference OK
}

entity Post {
  author: User
}

entity User {
  posts: [Post] via author    -- inverse OK
}
```

But be careful with `show` depth:

```
-- Could cause infinite loops
list User {
  show: name, manager.manager.manager.name   -- 3 levels deep
}
```

The interpreter limits traversal depth (default: 3 levels).

### Reserved Words

These cannot be used as entity or field names:

```
app, entity, view, config, list, detail, create, edit, action,
trigger, require, visibility, show, where, order, filter, by,
actions, input, then, validate, and, or, not, in, as, via,
true, false, null, public, authenticated, asc, desc,
current_user, role, now, today, id, created, updated
```

### Enum Values

Enum values must be strings:

```
-- OK
status: enum('draft', 'published')

-- ERROR: numbers not allowed
priority: enum(1, 2, 3)
```

### Empty Where Blocks

A where block with all conditions removed shows all rows:

```
list Post {
  show: title
  where: published
}

-- If published is always true, this is equivalent to:
list Post {
  show: title
}
```

### Action Input

Actions can receive additional input beyond the entity:

```
action assign(issue: Issue) {
  input: assignee            -- extra input field
  
  then {
    issue.assignee = assignee
  }
}
```

This generates a form for the action instead of a simple button.

### Multiple Lists in One View

You can have multiple lists of the same entity:

```
view dashboard {
  -- Recent posts
  list Post {
    show: title, created
    where: author == current_user
    order by: created desc
  }
  
  -- Drafts
  list Post {
    show: title, updated
    where: author == current_user and status == 'draft'
    order by: updated desc
  }
}
```

Each generates a separate API endpoint with a unique path.

### Computed Values in Then

You can compute values in `then` blocks:

```
create OrderLine as line {
  input: product, quantity
  
  then {
    line.unit_price = line.product.price
    line.total = line.quantity * line.unit_price
  }
}
```

### Nested Creates

You cannot create related entities in a `then` block directly. Use triggers:

```
-- ERROR: can't do this
action checkout(cart: Cart) {
  then {
    create Order { ... }      -- not supported
  }
}

-- OK: use trigger
action checkout(cart: Cart) {
  then {
    trigger('process_checkout', cart)
  }
}
```

### Date/Time Comparisons

Use built-in functions:

```
where: created >= today()           -- today's items
where: expires_at < now()           -- expired
where: date >= days_ago(7)          -- last week
where: date <= days_from_now(30)    -- next 30 days
```

### Case Sensitivity

- Keywords are case-insensitive: `ENTITY`, `Entity`, `entity` all work
- Entity names are case-sensitive: `User` ≠ `user`
- Field names are case-sensitive: `firstName` ≠ `firstname`

Recommendation: Use the conventions (PascalCase entities, snake_case fields).

### File Structure

One `.kelvin` file per app. If your app gets large, this is intentional—it forces you to keep things simple or split into separate services.

### Maximum Complexity

If you find yourself wanting:
- Complex computed fields with business logic
- Multi-step wizards
- Real-time updates
- Complex state machines

Consider whether Kelvin is the right tool, or if these parts should live in triggers or a separate service.

---

## Grammar Reference

```
// Top-level
app := 'app' NAME '{' app_content* '}'
app_content := config | entity | view

// Config
config := 'config' '{' config_option* '}'
config_option := NAME ':' (STRING | NUMBER)

// Entities
entity := 'entity' NAME '{' entity_content* '}'
entity_content := field | validation
field := NAME ':' type ('(' constraints ')')? '?'? ('=' default)?
validation := 'validate' expression

type := 'text' | 'email' | 'phone' | 'url' 
      | 'int' | 'money' 
      | 'bool' 
      | 'date' | 'time' | 'timestamp'
      | 'enum' '(' STRING (',' STRING)* ')'
      | 'uuid'
      | NAME                              // relationship
      | '[' NAME ']' ('via' NAME)?        // has-many

constraints := range | max_only | min_only
range := NUMBER '..' NUMBER
max_only := '..' NUMBER
min_only := NUMBER '..'

default := STRING | NUMBER | 'true' | 'false' | 'now()' | 'today()' | 'generate()'

// Views
view := 'view' NAME ('require' ':' expression)? '{' view_content* '}'
view_content := visibility | require_block | list | detail | create | edit | action

visibility := 'visibility' ':' ('public' | 'authenticated')

require_block := 'require' '{' expression* '}'
             | 'require' ':' expression

// List
list := 'list' NAME '{' list_clause* '}'
list_clause := show | where | order_by | filter_by | actions

show := 'show' ':' (field_ref (',' field_ref)* | '*')
where := 'where' ':' expression
       | 'where' '{' expression* '}'
order_by := 'order' 'by' ':' order_field (',' order_field)*
order_field := field_ref ('asc' | 'desc')?
filter_by := 'filter' 'by' ':' NAME
actions := 'actions' ':' NAME (',' NAME)*

// Detail
detail := 'detail' NAME ('as' NAME)? '{' detail_content* '}'
detail_content := show | where | list | create

// Create
create := 'create' NAME ('as' NAME)? '{' create_content* '}'
create_content := require_block | input | then_block

input := 'input' ':' NAME (',' NAME)*

// Edit
edit := 'edit' NAME ('as' NAME)? '{' edit_content* '}'
edit_content := require_block | input

// Action
action := 'action' NAME '(' NAME ':' NAME ')' '{' action_content* '}'
action_content := require_block | input | then_block

// Then
then_block := 'then' '{' statement* '}'
statement := assignment | delete_stmt | trigger_stmt | create_stmt

assignment := field_ref '=' expression
delete_stmt := 'delete' NAME
trigger_stmt := 'trigger' '(' STRING ',' expression ')'
create_stmt := 'create' NAME '{' assignment* '}'

// Expressions
expression := or_expr
or_expr := and_expr ('or' and_expr)*
and_expr := not_expr ('and' not_expr)*
not_expr := 'not'? comparison
comparison := additive (comp_op additive)?
comp_op := '==' | '!=' | '>' | '>=' | '<' | '<=' | 'in'
additive := multiplicative (('+' | '-') multiplicative)*
multiplicative := unary (('*' | '/') unary)*
unary := '!'? primary
primary := field_ref | literal | '(' expression ')' | list_literal | function_call

field_ref := NAME ('?'? '.' NAME)* ('or' expression)?
literal := STRING | NUMBER | 'true' | 'false' | 'null'
list_literal := '[' (expression (',' expression)*)? ']'
function_call := NAME '(' (expression (',' expression)*)? ')'

// Tokens
NAME := [a-zA-Z_][a-zA-Z0-9_]*
STRING := "'" [^']* "'"
NUMBER := [0-9]+ ('.' [0-9]+)?
COMMENT := '--' .*
```

---

## Appendix: Built-in Functions

| Function | Returns | Description |
|----------|---------|-------------|
| `now()` | timestamp | Current date and time |
| `today()` | date | Current date |
| `generate()` | uuid | New UUID |
| `days_ago(n)` | date | Date n days in the past |
| `days_from_now(n)` | date | Date n days in the future |
| `next_sequence(entity)` | int | Next sequence number for entity |

---

## Appendix: HTTP Status Codes

| Code | Meaning | When |
|------|---------|------|
| 200 | OK | Successful GET, PUT, action |
| 201 | Created | Successful POST |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Invalid input format |
| 401 | Unauthorized | Not authenticated |
| 403 | Forbidden | Authenticated but not allowed |
| 404 | Not Found | Entity doesn't exist |
| 422 | Unprocessable | Validation failed |
| 500 | Server Error | Something went wrong |

---

## Appendix: Error Response Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "email",
        "message": "must be a valid email address"
      },
      {
        "field": "age",
        "message": "must be at least 18"
      }
    ]
  }
}
```

---

## Appendix: Semantic Errors

The semantic analyzer validates your `.kelvin` file and reports errors with the following codes:

| Code | Error | Description |
|------|-------|-------------|
| E001 | Duplicate name | Entity, view, or action name is already defined |
| E002 | Duplicate field | Field name is already defined in this entity |
| E003 | Unknown entity | Reference to an entity that doesn't exist |
| E004 | Unknown field | Reference to a field that doesn't exist in the entity |
| E005 | Unknown action | Reference to an action that is neither built-in nor defined |
| E006 | Invalid default | Default value doesn't match the field type or enum values |
| E007 | Invalid constraint | Constraint min > max for text or int types |
| E008 | Auth requires User | Using `role` or `current_user` without a User entity defined |
| E009 | Invalid input field | Attempting to use implicit field (id, created, updated) as input |
| E010 | Invalid field traversal | Field path doesn't resolve to a valid field |

**Examples:**

```
-- E001: Duplicate entity name 'User'
entity User { name: text }
entity User { email: email }

-- E002: Duplicate field name 'title' in entity 'Post'
entity Post {
  title: text
  title: text(1..100)
}

-- E003: Unknown entity 'Admin'
entity Post {
  author: Admin
}

-- E005: Unknown action 'pubish' (typo)
list Post {
  actions: edit, pubish
}

-- E006: Invalid default value for enum
entity Post {
  status: enum('draft', 'published') = 'invalid'
}

-- E007: Invalid constraint (min > max)
entity Post {
  title: text(100..10)
}

-- E008: User entity required for authentication
view admin {
  require: role == 'admin'
}

-- E009: Cannot use implicit field as input
create Post {
  input: id, title
}

-- E010: Invalid field traversal
list Post {
  show: author.nonexistent
}
```
