# Actions

Actions are operations you can perform on entities. They appear as buttons in the admin panel and as API endpoints.

## Built-in Actions

These work without definition:

| Action | Description |
|--------|-------------|
| `edit` | Opens the edit form |
| `delete` | Deletes the entity |

Use them in your list blocks:

```kelvin
list Post {
  show: title, created
  actions: edit, delete
}
```

## Custom Actions

Define custom actions for business logic:

```kelvin
action action_name(param: Entity) {
  require: condition

  then {
    statements
  }
}
```

### State Transitions

Common pattern for workflow states:

```kelvin
action publish(post: Post) {
  require: post.status == 'draft'

  then {
    post.status = 'published'
    post.published_at = now()
  }
}

action archive(post: Post) {
  require: post.status in ('draft', 'published')

  then {
    post.status = 'archived'
  }
}
```

Use them in views:

```kelvin
list Post {
  show: title, status, created
  actions: edit, delete, publish, archive
}
```

### Toggle Pattern

Toggle a boolean field:

```kelvin
action toggle(task: Task) {
  then {
    task.done = !task.done
  }
}
```

### Require Blocks

Add multiple conditions:

```kelvin
action approve(application: Application) {
  require {
    application.status == 'pending'
    role == 'admin'
  }

  then {
    application.status = 'approved'
    application.approved_by = current_user
    application.approved_at = now()
  }
}
```

All conditions must pass (AND logic).

## Action Inputs (Planned)

Actions can accept additional input:

```kelvin
action reject(application: Application) {
  input: reason

  require: application.status == 'pending'

  then {
    application.status = 'rejected'
    application.rejection_reason = reason
  }
}
```

## Overriding Built-in Actions

Define an action with the same name to override default behavior:

```kelvin
-- Soft delete instead of hard delete
action delete(post: Post) {
  require: post.author == current_user or role == 'admin'

  then {
    post.status = 'deleted'
    post.deleted_at = now()
  }
}
```

## Using Triggers

Call external code from actions:

```kelvin
action approve(application: Application) {
  require: application.status == 'pending'

  then {
    application.status = 'approved'
    trigger('send_approval_email', application)
  }
}
```

See [Triggers](/concepts/triggers) for more details.

## API Endpoints

Actions generate POST endpoints:

```
POST /api/{view}/{entity}/:id/{action}
```

Example:

```bash
# Publish a post
curl -X POST http://localhost:3000/api/admin/post/123/publish \
  -H "Authorization: Bearer ..."

# Toggle a task
curl -X POST http://localhost:3000/api/tasks/task/456/toggle
```

## Complete Example

```kelvin
app IssueTracker {
  entity User {
    email: email
    name: text(1..100)
    role: enum('user', 'developer', 'manager') = 'user'
  }

  entity Issue {
    title: text(1..200)
    description: text(1..10000)
    status: enum('open', 'in_progress', 'resolved', 'closed') = 'open'
    priority: enum('low', 'medium', 'high', 'critical') = 'medium'
    assignee: User?
    reporter: User
  }

  view issues {
    list Issue {
      show: title, status, priority, assignee.name, created
      order by: created desc
      actions: edit, assign, start, resolve, close
    }

    create Issue as issue {
      input: title, description, priority

      then {
        issue.reporter = current_user
      }
    }

    -- Assign to someone
    action assign(issue: Issue) {
      require: role in ('developer', 'manager')

      then {
        issue.assignee = current_user
      }
    }

    -- Start working on it
    action start(issue: Issue) {
      require {
        issue.status == 'open'
        issue.assignee == current_user
      }

      then {
        issue.status = 'in_progress'
      }
    }

    -- Mark as resolved
    action resolve(issue: Issue) {
      require {
        issue.status == 'in_progress'
        issue.assignee == current_user
      }

      then {
        issue.status = 'resolved'
      }
    }

    -- Close the issue
    action close(issue: Issue) {
      require {
        issue.status == 'resolved'
        role == 'manager'
      }

      then {
        issue.status = 'closed'
      }
    }
  }
}
```

## Next Steps

- [Triggers](/concepts/triggers) — Escape hatch to custom code
- [Views](/concepts/views) — Configure where actions appear
