# Soft Delete

Mark records as deleted instead of permanently removing them.

## Problem

You want to delete records but keep them in the database for audit purposes or potential recovery.

## Solution

Override the built-in `delete` action to set a `deleted_at` timestamp instead of removing the record, then filter deleted items from views.

```kelvin
app MyApp {
  entity Post {
    title: text(1..200)
    body: text(1..50000)
    deleted_at: timestamp?    -- null means not deleted
  }

  view posts {
    list Post {
      show: title, created
      where: deleted_at == null   -- hide deleted posts
      actions: edit, delete
    }

    -- Override delete to soft-delete
    action delete(post: Post) {
      then {
        post.deleted_at = now()
      }
    }
  }

  -- Admin view to see deleted posts
  view admin {
    require: role == 'admin'

    list Post {
      show: title, deleted_at, created
      -- No where clause - shows ALL posts
      actions: restore, hard_delete
    }

    action restore(post: Post) {
      require: post.deleted_at != null

      then {
        post.deleted_at = null
      }
    }

    -- Actually delete (use with caution)
    -- Note: This uses the real delete, not our override
  }
}
```

## How It Works

1. **Add `deleted_at` field** — A nullable timestamp that's null for active records
2. **Override `delete` action** — Sets the timestamp instead of removing
3. **Filter in views** — Use `where: deleted_at == null` to hide deleted items
4. **Admin access** — A separate view can show all records including deleted ones
5. **Restore action** — Sets `deleted_at` back to null

## Variations

### With Deleted By User

Track who deleted the record:

```kelvin
entity Post {
  title: text(1..200)
  deleted_at: timestamp?
  deleted_by: User?
}

action delete(post: Post) {
  then {
    post.deleted_at = now()
    post.deleted_by = current_user
  }
}
```

### Cascade Soft Delete

When deleting a parent, soft-delete children too:

```kelvin
action delete(project: Project) {
  then {
    project.deleted_at = now()
    trigger('soft_delete_tasks', project)
  }
}
```

```javascript
// triggers/soft_delete_tasks.js
export default async function(project, { db }) {
  await db.updateMany('tasks',
    { project_id: project.id },
    { deleted_at: new Date() }
  );
}
```

### Auto-Purge Old Records

Use a trigger to permanently delete records after 30 days:

```javascript
// triggers/purge_deleted.js (run via cron)
export default async function(_, { db }) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  await db.deleteMany('posts', {
    deleted_at: { $lt: thirtyDaysAgo }
  });
}
```

## API Behavior

With soft delete, your API endpoints behave like this:

| Action | Before | After |
|--------|--------|-------|
| DELETE `/api/posts/post/:id` | Record removed | `deleted_at` set |
| GET `/api/posts/post` | All records | Only non-deleted |
| GET `/api/admin/post` | All records | All records (including deleted) |

## Considerations

- **Performance**: Large tables may need an index on `deleted_at`
- **Uniqueness**: If you have unique constraints, deleted records may conflict
- **GDPR**: Soft delete may not satisfy data deletion requirements
- **Storage**: Soft-deleted data still uses database space

## Related

- [Audit Logging](#) — Track all changes to records
- [Actions Reference](/concepts/actions) — Override built-in actions
