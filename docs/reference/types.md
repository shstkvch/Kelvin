# Field Types

Complete reference for all field types in Kelvin.

## Text Types

### text(min..max)

Variable-length string with length constraints.

```kelvin
name: text(1..100)        -- 1 to 100 characters
bio: text(0..5000)        -- up to 5000 characters
code: text(6..6)          -- exactly 6 characters
short: text(..50)         -- up to 50 characters
```

| Constraint | Meaning |
|------------|---------|
| `text(1..100)` | Required, 1-100 chars |
| `text(0..100)` | Optional empty string, up to 100 chars |
| `text(..100)` | Up to 100 chars |
| `text(10..)` | At least 10 chars |

**Database:** `VARCHAR(max)`
**HTML:** `<input type="text">`

### email

Valid email address.

```kelvin
email: email
contact: email?           -- optional
```

**Database:** `VARCHAR(254)`
**HTML:** `<input type="email">`
**Validation:** Email format (contains `@`, valid domain)

### phone

Phone number.

```kelvin
phone: phone
mobile: phone?
```

**Database:** `VARCHAR(20)`
**HTML:** `<input type="tel">`
**Validation:** Phone number format

### url

Valid URL.

```kelvin
website: url
avatar: url?
```

**Database:** `VARCHAR(2048)`
**HTML:** `<input type="url">`
**Validation:** URL format (valid protocol and domain)

## Numeric Types

### int(min..max)

Integer with range constraints.

```kelvin
age: int(0..150)          -- 0 to 150
quantity: int(1..)        -- at least 1
rating: int(1..5)         -- 1 to 5
count: int(..100)         -- up to 100
```

| Constraint | Meaning |
|------------|---------|
| `int(0..100)` | Between 0 and 100 |
| `int(1..)` | At least 1 (no max) |
| `int(..100)` | Up to 100 (no min) |

**Database:** `INTEGER`
**HTML:** `<input type="number">`

### money

Decimal currency value (4 decimal places).

```kelvin
price: money
total: money = 0
```

**Database:** `DECIMAL(19,4)`
**HTML:** `<input type="number" step="0.01">`

## Boolean

### bool

True or false value.

```kelvin
active: bool
published: bool = false
featured: bool = true
```

**Database:** `BOOLEAN`
**HTML:** `<input type="checkbox">`

## Date/Time Types

### date

Date only (no time).

```kelvin
birthday: date
due_date: date?
```

**Database:** `DATE`
**HTML:** `<input type="date">`

### time

Time only (no date).

```kelvin
start_time: time
end_time: time?
```

**Database:** `TIME`
**HTML:** `<input type="time">`

### timestamp

Date and time.

```kelvin
created: timestamp
scheduled_at: timestamp?
published_at: timestamp = now()
```

**Database:** `TIMESTAMP`
**HTML:** `<input type="datetime-local">`

## Enum

### enum('value1', 'value2', ...)

Choice from predefined options.

```kelvin
status: enum('draft', 'published', 'archived')
priority: enum('low', 'medium', 'high') = 'medium'
role: enum('user', 'admin') = 'user'
```

**Database:** `VARCHAR`
**HTML:** `<select>` with options

## UUID

### uuid

Universally unique identifier.

```kelvin
external_id: uuid = generate()
```

**Database:** `UUID` or `VARCHAR(36)`
**HTML:** (auto-generated, not editable)

## Relationships

### Entity (belongs-to)

Reference to another entity.

```kelvin
author: User              -- required
category: Category?       -- optional
```

Creates a foreign key column (`author_id`).

**Database:** Foreign key column
**HTML:** `<select>` with entity options

### [Entity] (has-many)

Collection of related entities.

```kelvin
posts: [Post]             -- inferred inverse
comments: [Comment] via author  -- explicit inverse
```

No column created — inferred from the belongs-to relationship.

## Modifiers

### Optional (?)

Makes a field nullable.

```kelvin
phone: phone?             -- can be null
bio: text(0..1000)?       -- can be null
manager: User?            -- optional relationship
```

### Default (= value)

Sets a default value.

```kelvin
status: enum('draft', 'published') = 'draft'
views: int(0..) = 0
active: bool = true
created: timestamp = now()
```

### Default Functions

| Function | Returns | Example |
|----------|---------|---------|
| `now()` | Current timestamp | `created: timestamp = now()` |
| `today()` | Current date | `due: date = today()` |
| `generate()` | New UUID | `id: uuid = generate()` |

## Type Summary

| Type | Database | HTML Input | Validation |
|------|----------|------------|------------|
| `text(min..max)` | VARCHAR | text | Length bounds |
| `email` | VARCHAR(254) | email | Email format |
| `phone` | VARCHAR(20) | tel | Phone format |
| `url` | VARCHAR(2048) | url | URL format |
| `int(min..max)` | INTEGER | number | Range bounds |
| `money` | DECIMAL(19,4) | number | 2 decimal places |
| `bool` | BOOLEAN | checkbox | - |
| `date` | DATE | date | Valid date |
| `time` | TIME | time | Valid time |
| `timestamp` | TIMESTAMP | datetime-local | Valid datetime |
| `enum(...)` | VARCHAR | select | Valid option |
| `uuid` | UUID | - | Valid UUID |
| `Entity` | FK column | select | Valid reference |
| `[Entity]` | - | - | - |
