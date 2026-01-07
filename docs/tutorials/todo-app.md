# Todo App

Build a personal task manager with toggle functionality.

**Time:** ~10 minutes

## What You'll Build

- Personal todo list
- Toggle tasks done/not done
- Filter by completion status

## The Complete App

```kelvin
app Tasks {
  entity User {
    email: email
    name: text(1..100)?
  }

  entity Task {
    title: text(1..200)
    description: text(0..1000)?
    done: bool = false
    priority: enum('low', 'medium', 'high') = 'medium'
    due_date: date?
    owner: User
  }

  view tasks {
    list Task {
      show: title, done, priority, due_date
      where: owner == current_user
      order by: created desc
      actions: edit, delete, toggle
    }

    create Task as task {
      input: title, description, priority, due_date

      then {
        task.owner = current_user
        task.done = false
      }
    }

    action toggle(task: Task) {
      then {
        task.done = !task.done
      }
    }
  }
}
```

## Step-by-Step

### Step 1: Task Entity

```kelvin
entity Task {
  title: text(1..200)
  description: text(0..1000)?
  done: bool = false
  priority: enum('low', 'medium', 'high') = 'medium'
  due_date: date?
  owner: User
}
```

Key points:
- `done: bool = false` — defaults to not done
- `priority` — enum with a sensible default
- `due_date: date?` — optional due date
- `owner: User` — belongs to a user

### Step 2: List with Personal Filter

```kelvin
list Task {
  show: title, done, priority, due_date
  where: owner == current_user
  order by: created desc
  actions: edit, delete, toggle
}
```

Key points:
- `where: owner == current_user` — only show your own tasks
- `actions: toggle` — includes our custom action

### Step 3: Create with Auto-Owner

```kelvin
create Task as task {
  input: title, description, priority, due_date

  then {
    task.owner = current_user
    task.done = false
  }
}
```

The `then` block automatically sets the owner to the logged-in user.

### Step 4: Toggle Action

```kelvin
action toggle(task: Task) {
  then {
    task.done = !task.done
  }
}
```

The `!` operator flips the boolean value.

## Running It

### Start the server

```bash
kelvin serve tasks.kelvin
```

### Create a user

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "me@example.com", "password": "secret123"}'
```

Save the token from the response.

### Create some tasks

```bash
TOKEN="your-token-here"

curl -X POST http://localhost:3000/api/tasks/task \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title": "Learn Kelvin", "priority": "high"}'

curl -X POST http://localhost:3000/api/tasks/task \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title": "Build something cool", "priority": "medium"}'
```

### List your tasks

```bash
curl http://localhost:3000/api/tasks/task \
  -H "Authorization: Bearer $TOKEN"
```

### Toggle a task

```bash
curl -X POST http://localhost:3000/api/tasks/task/{id}/toggle \
  -H "Authorization: Bearer $TOKEN"
```

## Enhancements

### Add Categories

```kelvin
entity Category {
  name: text(1..50)
  color: text(7..7)?  -- hex color like #FF5733
  owner: User
}

entity Task {
  title: text(1..200)
  done: bool = false
  category: Category?
  owner: User
}
```

### Add Subtasks

```kelvin
entity Task {
  title: text(1..200)
  done: bool = false
  parent: Task?       -- self-reference for subtasks
  owner: User
}
```

### Multiple Lists

```kelvin
entity TaskList {
  name: text(1..100)
  owner: User
}

entity Task {
  title: text(1..200)
  done: bool = false
  list: TaskList
  owner: User
}

view tasks {
  list TaskList {
    show: name
    where: owner == current_user
    actions: edit, delete
  }

  list Task {
    show: title, done, list.name
    where: owner == current_user
    actions: edit, delete, toggle
  }
}
```

### Priority Filtering (Planned)

When filter_by is implemented:

```kelvin
list Task {
  show: title, done, priority
  where: owner == current_user
  filter by: done, priority
  actions: toggle
}
```

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks/task` | List your tasks |
| POST | `/api/tasks/task` | Create task |
| PUT | `/api/tasks/task/:id` | Update task |
| DELETE | `/api/tasks/task/:id` | Delete task |
| POST | `/api/tasks/task/:id/toggle` | Toggle done |

## What You Learned

- **Boolean toggle**: `task.done = !task.done`
- **Personal data**: `where: owner == current_user`
- **Auto-assignment**: Setting owner in `then` block
- **Optional fields**: `due_date: date?`
- **Enums**: `priority: enum('low', 'medium', 'high')`

## Next Steps

- [Entities Reference](/concepts/entities) — More about field types
- [Actions Reference](/concepts/actions) — Advanced action patterns
- [Cookbooks](/cookbooks/) — Common patterns and recipes
