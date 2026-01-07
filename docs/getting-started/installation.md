# Installation

## Prerequisites

- **Node.js 18** or later
- **npm** (comes with Node.js)

## Install via npm

Install Kelvin globally:

```bash
npm install -g kelvin-lang
```

## Verify Installation

Check that Kelvin is installed correctly:

```bash
kelvin --version
```

You should see output like:

```
kelvin 0.1.1
```

## Create Your First App

Create a new Kelvin file:

```bash
# Create a new file
echo 'app Hello {
  entity Greeting {
    message: text(1..200)
  }

  view greetings {
    visibility: public

    list Greeting {
      show: message, created
    }

    create Greeting {
      input: message
    }
  }
}' > hello.kelvin
```

Start the development server:

```bash
kelvin serve hello.kelvin
```

Open http://localhost:3000/admin to see your app!

## Next Steps

- [Quickstart Guide](/getting-started/quickstart) - Build a complete app
- [Editor Setup](/getting-started/editor-setup) - Get syntax highlighting
