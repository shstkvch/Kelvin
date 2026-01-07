---
layout: home

hero:
  name: Kelvin
  text: Define your app. Get your API.
  tagline: A declarative language for building web applications. Define your data models, APIs, and admin interfaces in a single file.
  actions:
    - theme: brand
      text: Get Started
      link: /getting-started/
    - theme: alt
      text: View Examples
      link: /examples/
    - theme: alt
      text: GitHub
      link: https://github.com/shstkvch/Kelvin

features:
  - icon: 📝
    title: Declarative Syntax
    details: Describe what you want, not how to build it. Define entities, views, and access control in plain, readable code.
  - icon: ⚡
    title: Instant REST API
    details: Every entity automatically gets CRUD endpoints. List, create, read, update, delete — all generated for you.
  - icon: 🎛️
    title: Built-in Admin Panel
    details: A working admin interface out of the box. Login, list views, create forms, edit pages — ready to use.
  - icon: 🔐
    title: Authentication Included
    details: Add a User entity and get JWT-based authentication. Login, register, and protected routes automatically.
  - icon: 🔄
    title: Hot Reload
    details: Edit your .kelvin file and see changes instantly. No restart needed. Schema migrations happen automatically.
  - icon: 🧩
    title: Rich Type System
    details: Text, email, phone, URL, money, dates, enums, and relationships. With built-in validation and constraints.
---

## Quick Example

Define a complete blog backend in 20 lines:

```kelvin
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

    create Post {
      input: title, body
    }
  }
}
```

```bash
$ kelvin serve blog.kelvin
Server running at http://localhost:3000
```

That's it. You have a database, REST API, and admin panel.

## Ready to Get Started?

<script setup>
import { VPButton } from 'vitepress/theme'
</script>

<div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
  <VPButton tag="a" size="medium" theme="brand" text="Read the Docs" href="/getting-started/" />
  <VPButton tag="a" size="medium" theme="alt" text="5-Minute Tutorial" href="/tutorials/guestbook" />
</div>
