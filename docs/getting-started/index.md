# Getting Started

Welcome to Kelvin! This guide will help you get up and running in just a few minutes.

## What is Kelvin?

Kelvin is a declarative language for building web applications. Instead of writing boilerplate code for databases, APIs, and admin interfaces, you describe what you want and Kelvin generates it all.

```kelvin
app TaskManager {
  entity Task {
    title: text(1..200)
    done: bool = false
  }

  view tasks {
    list Task {
      show: title, done, created
      actions: edit, delete
    }

    create Task {
      input: title
    }
  }
}
```

This single file gives you:
- A SQLite database with a `tasks` table
- REST API endpoints (`GET /api/tasks`, `POST /api/tasks`, etc.)
- An admin panel with list and create views

## Quick Links

- [Installation](/getting-started/installation) - Install Kelvin via npm
- [Quickstart](/getting-started/quickstart) - Build your first app
- [Editor Setup](/getting-started/editor-setup) - Set up VSCode for Kelvin

## Philosophy

Kelvin is built on a few key principles:

1. **Declarative over imperative** - Describe what you want, not how to build it
2. **Sensible defaults** - Everything works out of the box with smart defaults
3. **Escape hatches** - When you need custom logic, triggers let you write JavaScript
4. **One file, one app** - Your entire backend defined in a single `.kelvin` file
