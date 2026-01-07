# Frequently Asked Questions

## General

### What is Kelvin?

Kelvin is a declarative language for building web applications. You define your data models, API endpoints, and access control in a single `.kelvin` file, and Kelvin generates a complete backend with database, REST API, and admin panel.

### When should I use Kelvin?

Kelvin is ideal for:

- **Admin panels** - Internal tools, dashboards, content management
- **CRUD applications** - Any app where you're managing data records
- **Rapid prototyping** - Get a working backend in minutes
- **MVPs** - Ship faster with less boilerplate

### When should I NOT use Kelvin?

Kelvin may not be the best choice for:

- **Complex business logic** - While triggers provide escape hatches, heavy business logic is better in traditional code
- **Real-time applications** - Kelvin generates REST APIs, not WebSocket connections
- **Highly custom UIs** - The admin panel is functional but not highly customizable

### Is Kelvin production-ready?

Kelvin is currently in active development (v0.1.x). It's suitable for internal tools and prototypes. We're working toward production readiness.

## Technical

### What database does Kelvin use?

Kelvin uses SQLite by default. Your data is stored in a `.db` file in the same directory as your `.kelvin` file.

### Can I use PostgreSQL or MySQL?

Not yet. PostgreSQL support is planned for a future release.

### How does authentication work?

Add a `User` entity with an `email` field, and Kelvin automatically generates:

- `POST /auth/register` - Create new user
- `POST /auth/login` - Get JWT token
- `GET /auth/me` - Get current user

Views are protected by default. Use `visibility: public` to make them accessible without authentication.

### Can I customize the admin UI?

The admin UI is generated from your `.kelvin` file. You can control:

- What fields are shown (`show:`)
- What actions are available (`actions:`)
- Access control (`require:`, `visibility:`)

For heavy customization, consider building your own frontend using the REST API.

### How do I add custom logic?

Use **triggers** to run custom JavaScript code:

```kelvin
trigger on_create {
  via('javascript', './triggers/send-email.js')
}
```

Triggers can send emails, call APIs, or run any Node.js code.

### What about migrations?

Kelvin handles migrations automatically. When you change your entities, the server detects changes and updates the database schema. New columns are added, but destructive changes (removing columns) require manual intervention.

## Comparison

### How is Kelvin different from Prisma?

Prisma is an ORM - it helps you interact with a database from code. Kelvin is a complete backend framework - it generates the API, admin panel, and handles authentication. You could think of Kelvin as "Prisma + Express + Admin Panel + Auth" in a declarative syntax.

### How is Kelvin different from Supabase?

Supabase gives you a Postgres database with auto-generated APIs. Kelvin is a self-hosted solution with a custom language for defining your schema and access control. Kelvin focuses on simplicity and a great developer experience for CRUD apps.

### How is Kelvin different from Rails/Django?

Rails and Django are full-stack frameworks with conventions. Kelvin is more opinionated and declarative - instead of writing controllers and models, you declare your intent. The trade-off is less flexibility but faster development for CRUD apps.

## Troubleshooting

### "Command not found: kelvin"

Make sure you installed Kelvin globally:

```bash
npm install -g kelvin-lang
```

### "Cannot find module"

Try reinstalling:

```bash
npm uninstall -g kelvin-lang
npm install -g kelvin-lang
```

### Database is locked

Make sure you don't have multiple `kelvin serve` processes running on the same database file.

### Changes not showing up

Kelvin hot-reloads on file changes. If changes aren't appearing:

1. Check for syntax errors (run `kelvin check your-file.kelvin`)
2. Restart the server with Ctrl+C and `kelvin serve` again
