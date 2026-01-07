# Guestbook in 5 Minutes

Build a simple guestbook where anyone can leave messages and admins can moderate.

## What You'll Build

- A public guestbook that anyone can view and sign
- An admin panel for managing entries
- Authentication for admins

## Prerequisites

- Node.js 18 or later
- npm

## Step 1: Install Kelvin

```bash
npm install -g kelvin-lang
```

## Step 2: Create Your App

Create a file called `guestbook.kelvin`:

```kelvin
app Guestbook {
  -- User entity enables authentication
  entity User {
    email: email
    name: text(1..100)?
  }

  entity Entry {
    name: text(1..100)
    message: text(1..500)
  }

  -- Public view: anyone can read and sign
  view guestbook {
    visibility: public

    list Entry {
      show: name, message, created
      order by: created desc
    }

    create Entry {
      input: name, message
    }
  }

  -- Admin view: manage entries (requires login)
  view admin {
    list Entry {
      show: name, message, created
      actions: delete
    }
  }
}
```

### What's happening here?

| Code | Meaning |
|------|---------|
| `entity User { email: email }` | Enables authentication |
| `entity Entry { ... }` | Defines the guestbook entry model |
| `visibility: public` | Anyone can access this view |
| `list Entry { ... }` | Shows all entries in a table |
| `create Entry { ... }` | Form to add new entries |
| `view admin { ... }` | Protected view (login required by default) |
| `actions: delete` | Adds a delete button to each row |

## Step 3: Validate

Check your file for errors:

```bash
kelvin check guestbook.kelvin
```

You should see:

```
Checking guestbook.kelvin...

App: Guestbook

Entities:
  - User (1 fields)
  - Entry (2 fields)

Views:
  - guestbook (public, 2 blocks)
  - admin (authenticated, 1 blocks)

No errors found.
```

## Step 4: Start the Server

```bash
kelvin serve guestbook.kelvin
```

Output:

```
Parsing guestbook.kelvin...
  Found 2 entities, 2 views
Initializing database at guestbook.db...

Guestbook is running!

  API:   http://localhost:3000/api
  Admin: http://localhost:3000/admin

Watching for changes...
```

## Step 5: Test the API

Open a new terminal:

### List entries (empty at first)

```bash
curl http://localhost:3000/api/guestbook/entry
```

```json
{"data":[],"pagination":{"page":1,"perPage":20,"total":0,"totalPages":0}}
```

### Sign the guestbook

```bash
curl -X POST http://localhost:3000/api/guestbook/entry \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice", "message": "Hello from Alice!"}'
```

### Add another entry

```bash
curl -X POST http://localhost:3000/api/guestbook/entry \
  -H "Content-Type: application/json" \
  -d '{"name": "Bob", "message": "Great guestbook!"}'
```

### List entries again

```bash
curl http://localhost:3000/api/guestbook/entry
```

Now you'll see both entries, newest first.

## Step 6: Admin Access

Open http://localhost:3000/admin in your browser.

You'll see a login page — but we need to create an admin first!

### Create an admin user

```bash
kelvin create-user guestbook.kelvin
```

Follow the prompts (or press Enter for defaults):

```
? Email (admin@example.com):
? Password: ********
? Name (Admin):
```

### Login

Go back to http://localhost:3000/admin and log in.

You'll see all guestbook entries with delete buttons.

::: tip Quick Login
Generate a one-time login link:
```bash
kelvin one-time-login guestbook.kelvin admin@example.com
```
:::

## Step 7: Try Hot Reload

With the server running, edit `guestbook.kelvin` to add an optional email field:

```kelvin
entity Entry {
  name: text(1..100)
  email: email?              -- Add this line
  message: text(1..500)
}
```

Save the file. The server automatically reloads:

```
File changed, reloading...
  Reloaded: 2 entities, 2 views
```

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/guestbook/entry` | List all entries |
| POST | `/api/guestbook/entry` | Create entry |
| GET | `/api/guestbook/entry/:id` | Get single entry |
| DELETE | `/api/admin/entry/:id` | Delete entry (auth required) |
| POST | `/auth/register` | Register user |
| POST | `/auth/login` | Login |

## What's Next?

You've built a working guestbook with public access and admin moderation!

- [Build a Blog](/tutorials/blog) — Learn relationships and roles
- [Entities Reference](/concepts/entities) — Deep dive into data modeling
- [Authentication](/concepts/authentication) — More about user management
