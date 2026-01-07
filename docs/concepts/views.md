# Views

Views define what users can see and do. Each view becomes a set of API endpoints and admin pages.

## Basic Syntax

```kelvin
view view_name {
  visibility: public | authenticated
  require: condition

  list Entity { ... }
  detail Entity { ... }
  create Entity { ... }
  edit Entity { ... }
  action name(param: Entity) { ... }
}
```

## Visibility

Control who can access a view:

```kelvin
view public_site {
  visibility: public          -- anyone can access
}

view dashboard {
  visibility: authenticated   -- must be logged in
}

view admin {
  -- default is authenticated
}
```

| Value | Meaning |
|-------|---------|
| `public` | No authentication required |
| `authenticated` | User must be logged in |
| (omitted) | Same as `authenticated` |

::: tip Secure by Default
If you forget to add `visibility: public`, the view requires authentication. This prevents accidentally exposing data.
:::

## Require Blocks

Add conditions beyond authentication:

```kelvin
-- Single condition (inline)
view admin {
  require: role == 'admin'
}

-- Multiple conditions (block)
view moderator {
  require {
    role in ('admin', 'moderator')
    reputation >= 100
  }
}
```

Conditions are AND-ed together — all must pass.

## List Block

Display a table of entities:

```kelvin
list Entity {
  show: field1, field2, relation.field
  where: condition
  order by: field asc|desc
  filter by: field
  actions: action1, action2
}
```

### Show

Specify which columns to display:

```kelvin
show: title, author.name, created      -- specific fields
show: *                                 -- all fields
show: user.email, user.profile.avatar  -- nested traversal
```

### Where

Hard filter that users cannot override:

```kelvin
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

### Order By

Sort the results:

```kelvin
order by: created desc                 -- single field
order by: priority asc, created desc   -- multiple fields (planned)
```

### Filter By

User-controllable filters in the UI (planned):

```kelvin
filter by: status          -- dropdown for enum
filter by: category        -- dropdown for relationship
filter by: created         -- date picker
filter by: active          -- checkbox for bool
```

### Actions

Available row actions:

```kelvin
actions: edit, delete                  -- built-in actions
actions: approve, reject, archive      -- custom actions
```

## Create Block

Define a form for creating entities:

```kelvin
create Entity as binding {
  input: field1, field2, field3

  then {
    binding.field = value
  }
}
```

### Input

Fields the user fills in:

```kelvin
create Post as post {
  input: title, body, category
}
```

### Then

System-set values after user input:

```kelvin
create Post as post {
  input: title, body, category

  then {
    post.author = current_user
    post.status = 'draft'
  }
}
```

## Detail Block (Planned)

Display a single entity:

```kelvin
detail Entity as binding {
  show: field1, field2
  where: condition

  -- nested lists
  list RelatedEntity {
    ...
  }
}
```

Example with nested list:

```kelvin
detail Post as post {
  show: title, body, author.name

  list Comment {
    show: body, author.name, created
    where: post == post
    order by: created asc
  }
}
```

## Edit Block (Planned)

Define a form for editing entities:

```kelvin
edit Entity as binding {
  require: condition
  input: field1, field2
}
```

Example:

```kelvin
edit Post as post {
  require: post.author == current_user or role == 'admin'
  input: title, body, category
}
```

## Generated API Endpoints

Each view generates REST endpoints:

| Block | Method | Endpoint | Description |
|-------|--------|----------|-------------|
| `list` | GET | `/api/{view}/{entity}` | List with pagination |
| `detail` | GET | `/api/{view}/{entity}/:id` | Single record |
| `create` | POST | `/api/{view}/{entity}` | Create record |
| `edit` | PUT | `/api/{view}/{entity}/:id` | Update record |
| `action` | POST | `/api/{view}/{entity}/:id/{action}` | Run action |

## Complete Example

```kelvin
view public {
  visibility: public

  list Post {
    show: title, author.name, created
    where: status == 'published'
    order by: created desc
  }
}

view author {
  require: role in ('author', 'editor', 'admin')

  list Post {
    show: title, status, created
    where: author == current_user
    actions: edit, delete, submit
  }

  create Post as post {
    input: title, body

    then {
      post.author = current_user
      post.status = 'draft'
    }
  }
}

view admin {
  require: role == 'admin'

  list Post {
    show: title, status, author.name, created
    actions: edit, delete, publish
  }

  list User {
    show: name, email, role
    actions: edit, delete
  }
}
```

## Next Steps

- [Authentication](/concepts/authentication) — Protect views with login
- [Actions](/concepts/actions) — Define custom operations
- [Generated API](/reference/api) — API endpoint details
