# Kelvin 

**A declarative language for building web applications.** 

⚠️ This is an on-going experiment in building a new programming language with Claude Code. Use at your own risk.

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

## Features

- **Declarative syntax** - Describe what you want, not how to build it
- **Instant API** - REST endpoints generated automatically from your schema
- **Built-in admin** - A working admin interface out of the box
- **Authentication** - JWT-based auth with user registration and login
- **Hot reload** - Edit your `.kelvin` file and see changes instantly
- **Type validation** - Rich type system with constraints (`text(1..100)`, `email`, `int(0..*)`)
- **SQLite storage** - Zero-config database that just works

## Quick Start

### Install

```bash
npm install -g kelvin-lang
```

### Create your first app

Create a file called `app.kelvin`:

```
app HelloWorld {
  entity Message {
    content: text(1..500)
  }

  view messages {
    visibility: public

    list Message {
      show: content, created
      order by: created desc
    }

    create Message {
      input: content
    }
  }
}
```

### Run it

```bash
kelvin serve app.kelvin
```

Your API is now running:

```bash
# Create a message
curl -X POST http://localhost:3000/api/messages/message \
  -H "Content-Type: application/json" \
  -d '{"content": "Hello, World!"}'

# List all messages
curl http://localhost:3000/api/messages/message
```

## Documentation

- **[Language Specification](kelvin-spec.md)** - Complete reference for the Kelvin language
- **[Tutorial](tutorial.md)** - Build a guestbook in 5 minutes
- **[Examples](examples/)** - Sample applications

## Project Status

Kelvin is in active development. The core features work:

- Entity definitions with validation
- Public and authenticated views
- List, create, edit, delete operations
- User authentication (JWT)
- Admin interface
- Hot reload

See [kelvin-spec.md](kelvin-spec.md) for the full roadmap.

## VS Code Extension

Syntax highlighting for `.kelvin` files is available in the `vscode-kelvin` directory.

To install:
1. Open VS Code
2. Run `code --install-extension vscode-kelvin/kelvin-lang-0.0.1.vsix`

Or copy the `vscode-kelvin` folder to your VS Code extensions directory.

## Development

To work on Kelvin itself:

```bash
git clone https://github.com/shstkvch/Kelvin.git
cd Kelvin
npm install
npm run build
```

Use the `kelvin-dev` script to run the CLI from the development repo:

```bash
# Add to your PATH (add this to ~/.bashrc or ~/.zshrc)
export PATH="/path/to/Kelvin/bin:$PATH"

# Now you can use kelvin-dev anywhere
kelvin-dev serve myapp.kelvin
```

The `kelvin-dev` command always runs from the development build, making it easy to test changes.

### Running Tests

```bash
npm test              # Unit and integration tests
npm run test:e2e      # End-to-end tests (requires Playwright)
```

## Contributing

Contributions are welcome! Please read the language spec before contributing to understand the design philosophy.

## License

MIT
