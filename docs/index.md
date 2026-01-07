---
layout: default
title: Home
---

# Kelvin

**A declarative language for building web applications.**

Define your data models, APIs, admin interfaces, and access control in a single file. No boilerplate, no code generation, no framework to learn.

```
app Blog {
  entity Post {
    title: text(1..200)
    body: text(1..50000)
    published: bool = false
  }

  view public {
    visibility: public

    list Post {
      show: title, created
      where: published
      order by: created desc
    }
  }

  view admin {
    list Post {
      show: title, published, created
      actions: edit, delete
    }
  }
}
```

```bash
$ kelvin serve blog.kelvin
Server running at http://localhost:3000
```

That's it. You have a database, REST API, and admin panel.

## Get Started

- [**Tutorial**](tutorial) - Build a guestbook in 5 minutes
- [**Language Specification**](specification) - Complete reference
- [**GitHub Repository**](https://github.com/shstkvch/Kelvin) - Source code and examples

## Features

- **Declarative syntax** - Describe what you want, not how to build it
- **Instant API** - REST endpoints generated automatically
- **Built-in admin** - A working admin interface out of the box
- **Authentication** - JWT-based auth with registration and login
- **Hot reload** - Edit and see changes instantly
- **Type validation** - Rich types with constraints
- **SQLite storage** - Zero-config database

## Installation

```bash
git clone https://github.com/shstkvch/Kelvin.git
cd Kelvin
npm install
npm run build
node dist/index.js serve your-app.kelvin
```

## License

MIT
