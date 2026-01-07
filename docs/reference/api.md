# Generated API

Kelvin automatically generates a REST API from your views.

## Endpoint Pattern

```
/api/{view_name}/{entity_name}
```

Example for a blog app:

| Kelvin | Endpoint |
|--------|----------|
| `view blog { list Post }` | `GET /api/blog/post` |
| `view admin { list User }` | `GET /api/admin/user` |

## CRUD Operations

### List (GET)

```bash
GET /api/{view}/{entity}
```

**Response:**

```json
{
  "data": [
    {
      "id": "abc123",
      "title": "Hello World",
      "created": "2024-01-15T10:30:00Z",
      "updated": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "perPage": 20,
    "total": 42,
    "totalPages": 3
  }
}
```

**Query Parameters:**

| Parameter | Description | Example |
|-----------|-------------|---------|
| `page` | Page number | `?page=2` |
| `per_page` | Items per page | `?per_page=50` |

### Get Single (GET)

```bash
GET /api/{view}/{entity}/:id
```

**Response:**

```json
{
  "data": {
    "id": "abc123",
    "title": "Hello World",
    "body": "Content here...",
    "author": {
      "id": "user1",
      "name": "Alice"
    },
    "created": "2024-01-15T10:30:00Z",
    "updated": "2024-01-15T10:30:00Z"
  }
}
```

### Create (POST)

```bash
POST /api/{view}/{entity}
Content-Type: application/json

{
  "title": "New Post",
  "body": "Content..."
}
```

**Response (201 Created):**

```json
{
  "data": {
    "id": "xyz789",
    "title": "New Post",
    "body": "Content...",
    "created": "2024-01-15T12:00:00Z",
    "updated": "2024-01-15T12:00:00Z"
  }
}
```

### Update (PUT)

```bash
PUT /api/{view}/{entity}/:id
Content-Type: application/json

{
  "title": "Updated Title"
}
```

**Response:**

```json
{
  "data": {
    "id": "abc123",
    "title": "Updated Title",
    "body": "Content here...",
    "updated": "2024-01-15T14:00:00Z"
  }
}
```

### Delete (DELETE)

```bash
DELETE /api/{view}/{entity}/:id
```

**Response (204 No Content):**

No body returned.

## Custom Actions

```bash
POST /api/{view}/{entity}/:id/{action}
```

Example:

```bash
POST /api/admin/post/abc123/publish
```

**Response:**

```json
{
  "data": {
    "id": "abc123",
    "status": "published",
    "published_at": "2024-01-15T15:00:00Z"
  }
}
```

## Authentication

### Login

```bash
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secret123"
}
```

**Response:**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

### Register

```bash
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secret123",
  "name": "Alice"
}
```

**Response:**

```json
{
  "data": {
    "id": "user123",
    "email": "user@example.com",
    "name": "Alice",
    "role": "user"
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

### Current User

```bash
GET /auth/me
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**Response:**

```json
{
  "data": {
    "id": "user123",
    "email": "user@example.com",
    "name": "Alice",
    "role": "user"
  }
}
```

### Using the Token

Include in the `Authorization` header:

```bash
curl http://localhost:3000/api/admin/post \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

## Error Responses

### 400 Bad Request

Invalid input data.

```json
{
  "error": "Validation failed",
  "details": {
    "title": "Title is required",
    "body": "Body must be at least 1 character"
  }
}
```

### 401 Unauthorized

Missing or invalid authentication.

```json
{
  "error": "Authentication required"
}
```

### 403 Forbidden

Authenticated but not authorized.

```json
{
  "error": "Access denied"
}
```

### 404 Not Found

Entity not found.

```json
{
  "error": "Post not found"
}
```

### 422 Unprocessable Entity

Validation rule failed.

```json
{
  "error": "Validation failed",
  "details": {
    "end_date": "End date must be after start date"
  }
}
```

## Status Codes

| Code | Meaning |
|------|---------|
| `200` | Success |
| `201` | Created |
| `204` | No Content (delete) |
| `400` | Bad Request |
| `401` | Unauthorized |
| `403` | Forbidden |
| `404` | Not Found |
| `422` | Validation Error |
| `500` | Server Error |

## Example: Complete Flow

```bash
# 1. Register
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "alice@example.com", "password": "secret123"}'

# Response: {"data": {...}, "token": "eyJ..."}

# 2. Use token to create a post
curl -X POST http://localhost:3000/api/dashboard/post \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJ..." \
  -d '{"title": "My First Post", "body": "Hello world!"}'

# Response: {"data": {"id": "...", "title": "My First Post", ...}}

# 3. List posts
curl http://localhost:3000/api/blog/post

# Response: {"data": [...], "pagination": {...}}

# 4. Run custom action
curl -X POST http://localhost:3000/api/dashboard/post/abc123/publish \
  -H "Authorization: Bearer eyJ..."

# Response: {"data": {"id": "abc123", "status": "published", ...}}
```
