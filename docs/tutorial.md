---
layout: default
title: Tutorial
---

# Kelvin Tutorial: Build a Guestbook in 5 Minutes

This tutorial walks you through building a simple guestbook backend with Kelvin. By the end, you'll have a working API and admin interface.

## What You'll Build

A guestbook where:
- Anyone can view all messages (public)
- Anyone can sign the guestbook (public)
- Admins can delete messages (authenticated)

## Prerequisites

- Node.js 18 or later
- npm

## Step 1: Set Up the Project

Clone the Kelvin repository and install dependencies:

```bash
git clone https://github.com/shstkvch/Kelvin.git
cd Kelvin
npm install
npm run build
```

## Step 2: Create Your App

Create a file called `guestbook.kelvin` in your current directory:

```
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

  -- Public view: anyone can read and sign the guestbook
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

Let's break this down:

- **`entity User`** - Required for authentication (login/register)
- **`entity Entry`** - Defines your data model with `name` and `message` fields
- **`view guestbook`** - A public view that anyone can access
- **`visibility: public`** - No authentication required
- **`list Entry`** - Shows all entries, newest first
- **`create Entry`** - A form to add new entries
- **`view admin`** - A protected view (requires login by default)
- **`actions: delete`** - Allows admins to delete entries

## Step 3: Validate Your App

Check that your Kelvin file is valid:

```bash
node dist/index.js check guestbook.kelvin
```

You should see:

```
Checking guestbook.kelvin...

App: Guestbook

Entities:
  - Entry (2 fields)

Views:
  - guestbook (public, 2 blocks)
  - admin (authenticated, 1 blocks)

No errors found.
```

## Step 4: Start the Server

Run the development server:

```bash
node dist/index.js serve guestbook.kelvin
```

You should see:

```
Parsing guestbook.kelvin...
  Found 2 entities, 2 views
Initializing database at guestbook.db...
Running migrations...
  Migrations complete

Guestbook is running!

  API:   http://localhost:3000/api
  Admin: http://localhost:3000/admin

Views:
  - guestbook (public)
  - admin (authenticated)

Watching for changes...

Press Ctrl+C to stop
```

## Step 5: Test the API

Open a new terminal and try these commands:

### View all entries (empty at first)

```bash
curl http://localhost:3000/api/guestbook/entry
```

Response:
```json
{"data":[],"pagination":{"page":1,"perPage":20,"total":0,"totalPages":0}}
```

### Sign the guestbook

```bash
curl -X POST http://localhost:3000/api/guestbook/entry \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice", "message": "Hello from Alice"}'
```

### View all entries again

```bash
curl http://localhost:3000/api/guestbook/entry
```

Now you should see both entries, with the newest first.

## Step 6: Use the Admin Interface

Open your browser to: **http://localhost:3000/admin**

You'll see a login page. Let's register a user:

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "password123"}'
```

Now go back to http://localhost:3000/admin and log in with:
- Email: `admin@example.com`
- Password: `password123`

You'll see the admin panel where you can view and delete guestbook entries.

## Step 7: Try Hot Reload

With the server still running, edit `guestbook.kelvin` to add a new field:

```
entity Entry {
  name: text(1..100)
  email: email?
  message: text(1..500)
}
```

Save the file. In the server terminal, you'll see:

```
File changed, reloading...
  Reloaded: 2 entities, 2 views
```

The server automatically detected the change and updated.

## API Reference

Your guestbook now has these endpoints:

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/guestbook/entry` | List all entries |
| POST | `/api/guestbook/entry` | Create a new entry |
| GET | `/api/guestbook/entry/:id` | Get a single entry |
| DELETE | `/api/admin/entry/:id` | Delete an entry (auth required) |
| POST | `/auth/register` | Register a new user |
| POST | `/auth/login` | Log in and get a token |
| GET | `/auth/me` | Get current user (auth required) |

## Next Steps

- [Full Language Specification](specification) - Complete reference
- [Examples on GitHub](https://github.com/shstkvch/Kelvin/tree/main/examples) - More sample apps
