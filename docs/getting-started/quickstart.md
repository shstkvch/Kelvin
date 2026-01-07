# Quickstart

Build a complete task manager in 5 minutes.

## What You'll Build

A task manager where you can:
- View all tasks
- Create new tasks
- Mark tasks as complete
- Delete tasks

## Step 1: Create the App

Create a file called `tasks.kelvin`:

```kelvin
app TaskManager {
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

## Step 2: Start the Server

Run the development server:

```bash
kelvin serve tasks.kelvin
```

You'll see:

```
Parsing tasks.kelvin...
  Found 1 entities, 1 views
Initializing database at tasks.db...

TaskManager is running!

  API:   http://localhost:3000/api
  Admin: http://localhost:3000/admin
```

## Step 3: Use the Admin Panel

Open http://localhost:3000/admin in your browser.

You'll see your task list (empty at first). Click "Create Task" to add your first task.

## Step 4: Use the API

Open a new terminal and try these commands:

### List all tasks

```bash
curl http://localhost:3000/api/tasks/task
```

### Create a task

```bash
curl -X POST http://localhost:3000/api/tasks/task \
  -H "Content-Type: application/json" \
  -d '{"title": "Learn Kelvin"}'
```

### Toggle a task

```bash
curl -X POST http://localhost:3000/api/tasks/task/1/toggle
```

## Step 5: Hot Reload

With the server still running, edit `tasks.kelvin`. Add a `priority` field:

```kelvin
entity Task {
  title: text(1..200)
  priority: enum('low', 'medium', 'high') = 'medium'
  done: bool = false
}
```

Save the file. The server automatically reloads:

```
File changed, reloading...
  Reloaded: 1 entities, 1 views
```

## What's Next?

- [Build a Guestbook](/tutorials/guestbook) - Add public access and authentication
- [Build a Blog](/tutorials/blog) - Learn about relationships and roles
- [Entities Reference](/concepts/entities) - Deep dive into data modeling
