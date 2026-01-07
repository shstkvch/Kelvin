# Core Concepts

Understand the fundamentals of Kelvin.

## Overview

A Kelvin application is defined in a single `.kelvin` file with three main building blocks:

```kelvin
app MyApp {
  entity Thing { ... }   -- Data models
  view things { ... }    -- API endpoints & UI
  action do { ... }      -- Custom operations
}
```

## Key Concepts

### [Entities](/concepts/entities)

Entities define your data models. Each entity becomes a database table with automatic `id`, `created`, and `updated` fields.

```kelvin
entity Post {
  title: text(1..200)
  body: text(1..50000)
  published: bool = false
}
```

### [Views](/concepts/views)

Views expose your entities through API endpoints and the admin panel. They define what data is visible and what operations are allowed.

```kelvin
view public {
  visibility: public

  list Post {
    show: title, created
    where: published
  }
}
```

### [Authentication](/concepts/authentication)

Add a `User` entity to enable authentication. Kelvin automatically generates login, register, and protected routes.

```kelvin
entity User {
  email: email
  name: text(1..100)?
}
```

### [Actions](/concepts/actions)

Actions let you define custom operations beyond basic CRUD. They can modify data and enforce business rules.

```kelvin
action publish(post: Post) {
  require: role == 'editor'
  then {
    post.published = true
  }
}
```

### [Triggers](/concepts/triggers)

Triggers are your escape hatch to JavaScript. Use them for sending emails, calling external APIs, or any custom logic.

```kelvin
trigger on_create {
  via('webhook', 'https://api.example.com/notify')
}
```

## Mental Model

Think of Kelvin as a declarative layer on top of a traditional web stack:

| Kelvin | Traditional |
|--------|-------------|
| Entity | Database table + ORM model |
| View | API routes + controllers |
| Action | Service methods |
| Trigger | Event handlers / webhooks |

The difference is you declare *what* you want, and Kelvin generates *how* it works.
