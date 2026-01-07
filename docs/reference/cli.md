# CLI Commands

The Kelvin CLI provides commands for development, validation, and user management.

## kelvin serve

Start the development server.

```bash
kelvin serve <file.kelvin>
kelvin serve myapp.kelvin --port 8080
```

**Output:**

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

**Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `--port`, `-p` | Port number | `3000` |
| `--db-path` | Custom database path | `{app_name}.db` |
| `--no-watch` | Disable hot reload | hot reload enabled |

The server watches for changes and automatically reloads when you save your `.kelvin` file.

## kelvin check

Validate your `.kelvin` file without starting the server.

```bash
kelvin check <file.kelvin>
```

**Valid Output:**

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

**Error Output:**

```
Checking myapp.kelvin...

Errors:
  [E003] Unknown entity 'Admin'
  [E010] Unknown field 'nonexistent' in entity 'Post'

Found 2 error(s).
```

## kelvin migrate

Run database migrations.

```bash
kelvin migrate <file.kelvin>
kelvin migrate myapp.kelvin --db-path ./data/myapp.db
```

**Output:**

```
Parsing myapp.kelvin...
Database: myapp.db
Running migrations...
Migrations complete.
```

**Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `--db-path` | Custom database path | `{app_name}.db` |

## kelvin create-user

Create a user interactively. Useful for setting up initial admin access.

```bash
kelvin create-user <file.kelvin>
```

**Interactive prompts:**

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

**Defaults when pressing Enter:**
- Email: `admin@example.com`
- Password: (must be provided)
- Name: `Admin`
- Role: `admin` (or first enum value)

**Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `--db` | Custom database path | `{app_name}.db` |

## kelvin one-time-login

Generate a one-time login link. Useful for quick access without remembering passwords.

```bash
kelvin one-time-login <file.kelvin> <email>
```

**Output:**

```
One-time login link generated:

  http://localhost:3000/admin/login?token=Xk9mPq2rStUvWxYzAbCdEf...

Expires in 15 minutes. This link can only be used once.
```

**Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `--db` | Custom database path | `{app_name}.db` |
| `--port` | Port for the generated URL | `3000` |

## Planned Commands

### kelvin new (Planned)

Create a new Kelvin project.

```bash
kelvin new myapp
kelvin new myapp --database postgres
```

### kelvin console (Planned)

Interactive REPL for querying data.

```bash
kelvin console
kelvin> Task.all()
kelvin> Task.where(done: true).count()
```

### kelvin routes (Planned)

List all generated routes.

```bash
kelvin routes
```

### kelvin schema (Planned)

Output OpenAPI schema.

```bash
kelvin schema > openapi.yaml
kelvin schema --format json > openapi.json
```
