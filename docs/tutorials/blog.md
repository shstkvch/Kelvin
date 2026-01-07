# Build a Blog

Build a multi-user blog with roles, relationships, and a publishing workflow.

**Time:** ~15 minutes

## What You'll Build

- Posts with authors (relationships)
- Multiple roles: author, editor, admin
- Publishing workflow: draft → published
- Role-based access control

## The Complete App

Here's the full blog app we're building:

```kelvin
app Blog {
  entity User {
    email: email
    name: text(1..100)
    role: enum('author', 'editor', 'admin') = 'author'
  }

  entity Post {
    title: text(1..200)
    body: text(1..50000)
    status: enum('draft', 'published') = 'draft'
    author: User
    published_at: timestamp?
  }

  -- Public: anyone can read published posts
  view blog {
    visibility: public

    list Post {
      show: title, author.name, published_at
      where: status == 'published'
      order by: published_at desc
    }
  }

  -- Authors: manage their own posts
  view my_posts {
    list Post {
      show: title, status, created
      where: author == current_user
      actions: edit, delete, publish
    }

    create Post as post {
      input: title, body

      then {
        post.author = current_user
        post.status = 'draft'
      }
    }

    action publish(post: Post) {
      require: post.status == 'draft'

      then {
        post.status = 'published'
        post.published_at = now()
      }
    }
  }

  -- Admin: manage all posts and users
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

Let's build this step by step.

## Step 1: User Entity with Roles

```kelvin
entity User {
  email: email
  name: text(1..100)
  role: enum('author', 'editor', 'admin') = 'author'
}
```

Key points:
- `email` field enables authentication
- `role` is an enum with a default of `'author'`
- New users are authors by default

## Step 2: Post Entity with Relationship

```kelvin
entity Post {
  title: text(1..200)
  body: text(1..50000)
  status: enum('draft', 'published') = 'draft'
  author: User
  published_at: timestamp?
}
```

Key points:
- `author: User` creates a belongs-to relationship (foreign key)
- `status` tracks the publishing workflow
- `published_at` is optional (null until published)

## Step 3: Public Blog View

```kelvin
view blog {
  visibility: public

  list Post {
    show: title, author.name, published_at
    where: status == 'published'
    order by: published_at desc
  }
}
```

Key points:
- `visibility: public` — no login required
- `where: status == 'published'` — only show published posts
- `author.name` — traverse the relationship to show author's name

## Step 4: Author Dashboard

```kelvin
view my_posts {
  list Post {
    show: title, status, created
    where: author == current_user
    actions: edit, delete, publish
  }

  create Post as post {
    input: title, body

    then {
      post.author = current_user
      post.status = 'draft'
    }
  }

  action publish(post: Post) {
    require: post.status == 'draft'

    then {
      post.status = 'published'
      post.published_at = now()
    }
  }
}
```

Key points:
- No visibility specified → requires login
- `where: author == current_user` — only show user's own posts
- `then { post.author = current_user }` — auto-set author on create
- Custom `publish` action with requirements

## Step 5: Admin View

```kelvin
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
```

Key points:
- `require: role == 'admin'` — only admins can access
- Can see and manage ALL posts, not just their own
- Can manage users too

## Running the Blog

### Start the server

```bash
kelvin serve blog.kelvin
```

### Create users

```bash
# Create an admin
kelvin create-user blog.kelvin
# Enter: admin@example.com, password, Admin, admin

# Register an author via API
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "alice@example.com", "password": "secret123", "name": "Alice"}'
```

### Create a post

First, login as Alice:

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "alice@example.com", "password": "secret123"}' | jq -r '.token')
```

Create a draft:

```bash
curl -X POST http://localhost:3000/api/my_posts/post \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title": "My First Post", "body": "Hello world!"}'
```

### Publish it

```bash
curl -X POST http://localhost:3000/api/my_posts/post/{id}/publish \
  -H "Authorization: Bearer $TOKEN"
```

### View public blog

```bash
curl http://localhost:3000/api/blog/post
```

## Adding an Editor Role

Want editors who can publish anyone's posts? Add a new view:

```kelvin
view editor {
  require: role in ('editor', 'admin')

  list Post {
    show: title, status, author.name, created
    where: status == 'draft'
    actions: publish, reject
  }

  action publish(post: Post) {
    then {
      post.status = 'published'
      post.published_at = now()
    }
  }

  action reject(post: Post) {
    then {
      post.status = 'rejected'
    }
  }
}
```

## What You Learned

- **Relationships**: `author: User` creates a foreign key
- **Traversal**: `author.name` in show clauses
- **Context**: `current_user` for the logged-in user
- **Require**: Role-based access control
- **Actions**: Custom operations with conditions
- **Then blocks**: Auto-set values on create/action

## Next Steps

- [Todo App](/tutorials/todo-app) — Toggle actions and filtering
- [Actions Reference](/concepts/actions) — More action patterns
- [Authentication](/concepts/authentication) — Deep dive into auth
