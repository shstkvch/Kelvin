---
layout: default
title: Language Specification
---

# Kelvin Language Specification

This is a summary of the Kelvin language. For the complete reference, see [kelvin-spec.md](https://github.com/shstkvch/Kelvin/blob/main/kelvin-spec.md) in the repository.

## App Structure

Every Kelvin application is defined in a single `.kelvin` file:

```
app MyApp {
  -- Configuration
  config { ... }

  -- Data models
  entity User { ... }
  entity Post { ... }

  -- API views
  view public { ... }
  view admin { ... }
}
```

## Entities

Entities define your data models:

```
entity Post {
  title: text(1..200)           -- Required, 1-200 chars
  body: text(1..50000)          -- Required, up to 50k chars
  published: bool = false       -- Default value
  views: int(0..*) = 0          -- Non-negative integer
  author: User                  -- Relationship
  tags: text[]?                 -- Optional array
}
```

### Built-in Types

| Type | Description | Example |
|------|-------------|---------|
| `text` | String with length constraints | `text(1..100)` |
| `int` | Integer with range | `int(0..100)` |
| `float` | Decimal number | `float(0..*)` |
| `bool` | Boolean | `bool = false` |
| `email` | Email validation | `email` |
| `datetime` | Timestamp | `datetime` |
| `Entity` | Relationship | `author: User` |

### Type Modifiers

- `?` - Optional field: `name: text?`
- `[]` - Array: `tags: text[]`
- `= value` - Default: `active: bool = true`

## Views

Views define API endpoints and permissions:

```
view blog {
  visibility: public           -- No auth required

  list Post {
    show: title, author, created
    where: published           -- Filter condition
    order by: created desc     -- Sort order
  }

  read Post {
    show: title, body, author, created
    where: published
  }
}

view admin {
  -- Authenticated by default

  list Post {
    show: title, published, created
    actions: edit, delete
  }

  create Post {
    input: title, body
  }

  edit Post {
    input: title, body, published
  }
}
```

### View Blocks

| Block | Purpose |
|-------|---------|
| `list` | Display multiple records |
| `read` | Display single record |
| `create` | Create new records |
| `edit` | Update existing records |
| `delete` | (via actions) Delete records |

### Visibility

- `visibility: public` - No authentication required
- Default - Requires authentication
- `require: condition` - Custom access rules (planned)

## Authentication

Include a `User` entity to enable authentication:

```
entity User {
  email: email
  name: text(1..100)?
  role: text?
}
```

This automatically enables:
- `POST /auth/register` - User registration
- `POST /auth/login` - Login (returns JWT)
- `GET /auth/me` - Current user info

## Generated API

For each view, Kelvin generates REST endpoints:

| View Block | HTTP Method | Endpoint |
|------------|-------------|----------|
| `list Entity` | GET | `/api/{view}/{entity}` |
| `read Entity` | GET | `/api/{view}/{entity}/:id` |
| `create Entity` | POST | `/api/{view}/{entity}` |
| `edit Entity` | PUT | `/api/{view}/{entity}/:id` |
| `delete` action | DELETE | `/api/{view}/{entity}/:id` |

## CLI Commands

```bash
# Validate your app
kelvin check myapp.kelvin

# Start the server
kelvin serve myapp.kelvin

# Options
kelvin serve myapp.kelvin --port 8080
kelvin serve myapp.kelvin --db-path ./data/app.db
kelvin serve myapp.kelvin --no-watch
```

## Full Reference

For complete documentation including:
- Custom actions and triggers
- Advanced filtering
- Role-based access control
- Configuration options
- Deployment guide

See the [full specification](https://github.com/shstkvch/Kelvin/blob/main/kelvin-spec.md).
