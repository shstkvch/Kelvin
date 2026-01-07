# Editor Setup

Get the best experience writing Kelvin code with VS Code.

## VS Code Extension

Install the official Kelvin extension for Visual Studio Code:

1. Open VS Code
2. Go to Extensions (Cmd+Shift+X / Ctrl+Shift+X)
3. Search for "Kelvin"
4. Click Install

Or install from the command line:

```bash
code --install-extension kelvin-lang.kelvin
```

## Features

The extension provides:

### Syntax Highlighting

Full syntax highlighting for `.kelvin` files:
- Keywords (`entity`, `view`, `action`)
- Types (`text`, `email`, `bool`, `enum`)
- Built-in variables (`current_user`, `role`)
- Comments and strings

### Bracket Matching

Automatic bracket matching and highlighting for:
- Curly braces `{ }`
- Parentheses `( )`
- Square brackets `[ ]`

### Code Snippets

Quick snippets for common patterns:

| Prefix | Expands to |
|--------|------------|
| `app` | App structure |
| `entity` | Entity definition |
| `view` | View block |
| `list` | List block |
| `action` | Custom action |

## File Association

The extension automatically associates `.kelvin` files with the Kelvin language mode. You'll see "Kelvin" in the status bar when editing a `.kelvin` file.

## Other Editors

Currently, only VS Code is officially supported. Contributions for other editors are welcome! The TextMate grammar is available at:

```
vscode-kelvin/syntaxes/kelvin.tmLanguage.json
```

This grammar can be used in any editor that supports TextMate grammars (Sublime Text, TextMate, Atom, etc.).
