# Reference

Complete reference documentation for Kelvin.

## Quick Reference

| Topic | Description |
|-------|-------------|
| [CLI Commands](/reference/cli) | Command-line interface |
| [Field Types](/reference/types) | All available data types |
| [Generated API](/reference/api) | REST API endpoints |
| [Grammar](/reference/grammar) | Formal language grammar |

## CLI Commands

```bash
kelvin serve <file>      # Start development server
kelvin check <file>      # Validate syntax
kelvin migrate <file>    # Run database migrations
kelvin create-user       # Create a user
kelvin one-time-login    # Generate login link
```

## Field Types

| Type | Example | Description |
|------|---------|-------------|
| `text(min..max)` | `text(1..200)` | String with length constraints |
| `email` | `email` | Valid email address |
| `bool` | `bool = false` | True/false |
| `int(min..max)` | `int(0..100)` | Integer with range |
| `enum('a', 'b')` | `enum('draft', 'published')` | Choice from options |
| `timestamp` | `timestamp` | Date and time |
| `date` | `date` | Date only |
| `Entity` | `author: User` | Belongs-to relationship |
| `[Entity]` | `posts: [Post]` | Has-many relationship |

## Modifiers

| Modifier | Meaning |
|----------|---------|
| `?` | Optional field |
| `= value` | Default value |

## Keywords

| Category | Keywords |
|----------|----------|
| Structure | `app`, `entity`, `view`, `config` |
| Blocks | `list`, `detail`, `create`, `edit`, `action`, `trigger` |
| Clauses | `show`, `where`, `order by`, `filter by`, `actions`, `input` |
| Access | `visibility`, `require`, `public`, `authenticated` |
| Logic | `and`, `or`, `not`, `in`, `then` |
| Order | `asc`, `desc` |

## Context Variables

| Variable | Available In | Description |
|----------|--------------|-------------|
| `current_user` | `require`, `where` | The logged-in user |
| `role` | `require` | User's role field |
