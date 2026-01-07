# Kelvin Language Support for VSCode

This extension provides language support for [Kelvin](https://kelvin-lang.org), a declarative language for building web applications.

## Features

- **Syntax Highlighting**: Full syntax highlighting for `.kelvin` files
- **Snippets**: Quick scaffolding for common patterns
- **Bracket Matching**: Auto-close and match brackets
- **Code Folding**: Collapse blocks for easier navigation
- **Comment Toggling**: Use `Ctrl+/` to toggle comments

## Snippets

| Prefix | Description |
|--------|-------------|
| `app` | Create a new app |
| `entity` | Create an entity |
| `entity-user` | Create a User entity |
| `view` | Create a view |
| `view-require` | Create a view with require |
| `list` | Create a list block |
| `detail` | Create a detail block |
| `create` | Create a create block |
| `edit` | Create an edit block |
| `action` | Create an action |
| `action-trigger` | Create an action with trigger |
| `field-text` | Add a text field |
| `field-email` | Add an email field |
| `field-int` | Add an integer field |
| `field-money` | Add a money field |
| `field-bool` | Add a boolean field |
| `field-enum` | Add an enum field |
| `field-date` | Add a date field |
| `field-timestamp` | Add a timestamp field |
| `field-belongs` | Add a belongs-to relationship |
| `field-hasmany` | Add a has-many relationship |
| `validate` | Add a validation rule |
| `trigger` | Add a trigger call |

## Example

```kelvin
app Blog {
  config {
    accent: '#6366F1'
  }
  
  entity User {
    email: email
    name: text(1..100)
    role: enum('author', 'admin') = 'author'
  }
  
  entity Post {
    title: text(1..200)
    body: text(1..50000)
    author: User
    published: bool = false
  }
  
  view public {
    visibility: public
    
    list Post {
      show: title, author.name, created
      where: published
      order by: created desc
    }
  }
  
  view admin {
    require: role == 'admin'
    
    list Post {
      show: title, author.name, published
      actions: edit, delete, publish
    }
    
    action publish(post: Post) {
      require: post.published == false
      
      then {
        post.published = true
      }
    }
  }
}
```

## Installation

1. Open VSCode
2. Go to Extensions (Ctrl+Shift+X)
3. Search for "Kelvin"
4. Click Install

Or install from the command line:

```bash
code --install-extension kelvin-lang.kelvin-vscode
```

## Requirements

No additional requirements. For running Kelvin apps, install the Kelvin CLI:

```bash
npm install -g kelvin-lang
```

## Links

- [Kelvin Documentation](https://kelvin-lang.org/docs)
- [GitHub Repository](https://github.com/kelvin-lang/kelvin)
- [Issue Tracker](https://github.com/kelvin-lang/vscode-kelvin/issues)

## License

MIT
