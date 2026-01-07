# Authentication

Kelvin includes built-in JWT authentication. Add a `User` entity to enable it.

## Enabling Authentication

Define a `User` entity with an `email` field:

```kelvin
entity User {
  email: email
  name: text(1..100)?
  role: enum('user', 'admin') = 'user'
}
```

The `email` field is used for login. Passwords are handled automatically — they're hashed and never exposed through the API.

## Generated Auth Routes

These routes are automatically created:

| Route | Method | Description |
|-------|--------|-------------|
| `/auth/register` | POST | Create new account |
| `/auth/login` | POST | Get access token |
| `/auth/logout` | POST | Invalidate token |
| `/auth/me` | GET | Get current user |

### Register

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "secret123"}'
```

Response:

```json
{
  "data": {
    "id": "...",
    "email": "user@example.com",
    "role": "user"
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

### Login

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "secret123"}'
```

Response:

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

### Using the Token

Include the token in the `Authorization` header:

```bash
curl http://localhost:3000/api/admin/user \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

### Get Current User

```bash
curl http://localhost:3000/auth/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

## Context Variables

In authenticated views, these variables are available:

| Variable | Description |
|----------|-------------|
| `current_user` | The logged-in User entity |
| `role` | Shorthand for `current_user.role` |
| `authenticated` | Boolean, true if logged in |

## Using Context in Views

### Filter by Current User

Show only the current user's data:

```kelvin
view my_posts {
  list Post {
    show: title, status, created
    where: author == current_user
    actions: edit, delete
  }
}
```

### Role-Based Access

Restrict views by role:

```kelvin
view admin {
  require: role == 'admin'

  list User {
    show: name, email, role
    actions: edit, delete
  }
}
```

### Multiple Roles

Allow multiple roles:

```kelvin
view moderator {
  require: role in ('admin', 'moderator')

  list Comment {
    show: body, author.name, created
    actions: delete, approve
  }
}
```

## Creating Admin Users

### Via CLI

The easiest way to create an admin:

```bash
kelvin create-user myapp.kelvin
```

You'll be prompted for email, password, name, and role.

### Via API

Register normally, then update the role through admin:

```bash
# Register
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "secret123"}'

# Update role (requires existing admin)
curl -X PUT http://localhost:3000/api/admin/user/{id} \
  -H "Authorization: Bearer ..." \
  -H "Content-Type: application/json" \
  -d '{"role": "admin"}'
```

### One-Time Login

For quick admin access, generate a one-time login link:

```bash
kelvin one-time-login myapp.kelvin admin@example.com
```

This outputs a URL that expires after 15 minutes.

## Visibility vs Require

| Concept | Purpose | Example |
|---------|---------|---------|
| `visibility` | Whether authentication is needed | `visibility: public` |
| `require` | Additional conditions after auth | `require: role == 'admin'` |

Example combining both:

```kelvin
-- Anyone can see published posts
view public {
  visibility: public

  list Post {
    where: status == 'published'
  }
}

-- Only admins can manage all posts
view admin {
  require: role == 'admin'

  list Post {
    actions: edit, delete
  }
}
```

## Complete Example

```kelvin
app Blog {
  entity User {
    email: email
    name: text(1..100)?
    role: enum('user', 'author', 'admin') = 'user'
  }

  entity Post {
    title: text(1..200)
    body: text(1..50000)
    status: enum('draft', 'published') = 'draft'
    author: User
  }

  -- Public: anyone can read published posts
  view blog {
    visibility: public

    list Post {
      show: title, author.name, created
      where: status == 'published'
      order by: created desc
    }
  }

  -- My posts: logged-in users see their own posts
  view my_posts {
    list Post {
      show: title, status, created
      where: author == current_user
      actions: edit, delete
    }

    create Post as post {
      input: title, body
      then {
        post.author = current_user
      }
    }
  }

  -- Admin: full access to all posts
  view admin {
    require: role == 'admin'

    list Post {
      show: title, status, author.name, created
      actions: edit, delete
    }

    list User {
      show: name, email, role
      actions: edit, delete
    }
  }
}
```

## Next Steps

- [Actions](/concepts/actions) — Custom operations with permissions
- [Views](/concepts/views) — More view configuration options
