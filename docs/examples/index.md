# Examples

Complete, working examples you can use as starting points.

## Featured Examples

### Guestbook

A simple public guestbook with admin moderation.

**Features:** Public submissions, admin login, delete action

```kelvin
app Guestbook {
  entity User {
    email: email
    name: text(1..100)?
  }

  entity Entry {
    name: text(1..100)
    message: text(1..500)
  }

  view guestbook {
    visibility: public

    list Entry {
      show: name, message, created
      order by: created desc
    }

    create Entry {
      input: name, message
    }
  }

  view admin {
    list Entry {
      show: name, message, created
      actions: delete
    }
  }
}
```

[View full tutorial →](/tutorials/guestbook)

---

### Blog

A multi-role blog with drafts and publishing workflow.

**Features:** Author/Editor/Admin roles, draft states, relationships

```kelvin
app Blog {
  entity User {
    email: email
    name: text(1..100)?
    role: enum('author', 'editor', 'admin') = 'author'
  }

  entity Post {
    title: text(1..200)
    body: text(1..50000)
    status: enum('draft', 'review', 'published') = 'draft'
    author: User
  }

  view posts {
    require: role in ('author', 'editor', 'admin')

    list Post {
      show: title, status, author.name, created
      actions: edit, delete, submit, approve
    }
  }
}
```

[View full tutorial →](/tutorials/blog)

---

### Task Manager

A personal task manager with completion toggle.

**Features:** Custom actions, boolean toggle, filtering

```kelvin
app Tasks {
  entity Task {
    title: text(1..200)
    done: bool = false
  }

  view tasks {
    list Task {
      show: title, done, created
      order by: created desc
      actions: edit, delete, toggle
    }

    create Task {
      input: title
    }

    action toggle(task: Task) {
      then {
        task.done = !task.done
      }
    }
  }
}
```

---

## Running Examples

All examples are available in the `examples/` directory:

```bash
git clone https://github.com/shstkvch/Kelvin
cd Kelvin
kelvin serve examples/guestbook.kelvin
```

## Contributing Examples

Have a useful example? Contributions are welcome! See [CONTRIBUTING.md](https://github.com/shstkvch/Kelvin/blob/main/CONTRIBUTING.md) for guidelines.
