# Entities

Entities define your data models. Each entity becomes a database table with automatic CRUD operations.

## Basic Syntax

```kelvin
entity EntityName {
  field_name: type(constraints)
  field_name: type?                -- optional (nullable)
  field_name: type = default       -- with default value
}
```

## Field Types

### Text Types

```kelvin
name: text(1..100)        -- required, 1-100 characters
bio: text(0..5000)?       -- optional, up to 5000 characters
code: text(6..6)          -- exactly 6 characters
```

| Type | Description | Database | HTML Input |
|------|-------------|----------|------------|
| `text(min..max)` | String with length bounds | VARCHAR(max) | text |
| `text(..max)` | String with max length | VARCHAR(max) | text |
| `email` | Valid email address | VARCHAR(254) | email |
| `phone` | Phone number | VARCHAR(20) | tel |
| `url` | Valid URL | VARCHAR(2048) | url |

### Numeric Types

```kelvin
age: int(0..150)          -- integer with range
price: money              -- decimal currency
quantity: int(1..)        -- minimum 1, no maximum
rating: int(1..5)         -- 1 to 5
```

| Type | Description | Database | HTML Input |
|------|-------------|----------|------------|
| `int(min..max)` | Integer with range bounds | INTEGER | number |
| `int(min..)` | Integer with minimum only | INTEGER | number |
| `int(..max)` | Integer with maximum only | INTEGER | number |
| `money` | Decimal currency (4 decimal places) | DECIMAL(19,4) | number |

### Date/Time Types

```kelvin
birthday: date
start_time: time
created: timestamp = now()
```

| Type | Description | Database | HTML Input |
|------|-------------|----------|------------|
| `date` | Date only | DATE | date |
| `time` | Time only | TIME | time |
| `timestamp` | Date and time | TIMESTAMP | datetime-local |

### Other Types

```kelvin
active: bool = true
status: enum('draft', 'published', 'archived')
website: url?
```

| Type | Description | Database | HTML Input |
|------|-------------|----------|------------|
| `bool` | True/false | BOOLEAN | checkbox |
| `enum('a', 'b', 'c')` | Choice from options | VARCHAR | select |
| `uuid` | Unique identifier | UUID | auto-generated |

## Relationships

### Belongs-to (Many-to-One)

A belongs-to relationship creates a foreign key column:

```kelvin
entity Post {
  title: text(1..200)
  author: User              -- foreign key to User
  category: Category?       -- optional relationship
}
```

This creates an `author_id` column in the `posts` table.

### Has-many (One-to-Many)

Has-many is the inverse of belongs-to. It doesn't create a column — it's inferred:

```kelvin
entity User {
  email: email
  posts: [Post]             -- inferred from Post.author
}
```

Use `via` to specify the inverse field explicitly:

```kelvin
entity User {
  comments: [Comment] via author
}
```

### Many-to-Many

Use a join entity for many-to-many relationships:

```kelvin
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

## Implicit Fields

Every entity automatically has these fields — you don't need to define them:

| Field | Type | Description |
|-------|------|-------------|
| `id` | uuid | Primary key, auto-generated |
| `created` | timestamp | Set when record is inserted |
| `updated` | timestamp | Set on every update |

You can reference them in views:

```kelvin
list Post {
  show: title, created
  order by: created desc
}
```

## Optional Fields

Add `?` to make a field nullable:

```kelvin
entity User {
  name: text(1..100)        -- required
  phone: phone?             -- optional
  bio: text(0..1000)?       -- optional
}
```

## Default Values

Use `=` to set defaults:

```kelvin
entity Post {
  status: enum('draft', 'published') = 'draft'
  views: int(0..) = 0
  created: timestamp = now()
}
```

### Default Functions

| Function | Returns |
|----------|---------|
| `now()` | Current timestamp |
| `today()` | Current date |
| `generate()` | New UUID |

## Validation

Add `validate` rules for cross-field validation:

```kelvin
entity Event {
  start_date: date
  end_date: date

  validate end_date >= start_date
}
```

Validation runs before insert and update. Failed validation returns a 422 error.

## Complete Example

```kelvin
entity User {
  email: email
  name: text(1..100)
  role: enum('user', 'admin') = 'user'
  bio: text(0..1000)?
  posts: [Post]
}

entity Post {
  title: text(1..200)
  body: text(1..50000)
  status: enum('draft', 'published', 'archived') = 'draft'
  author: User
  published_at: timestamp?

  validate status != 'published' or published_at != null
}
```

## Next Steps

- [Views](/concepts/views) — Expose entities through APIs
- [Authentication](/concepts/authentication) — Add user login
- [Actions](/concepts/actions) — Custom operations
