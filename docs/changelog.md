# Changelog

All notable changes to Kelvin will be documented here.

## v0.1.1

**Released:** January 2026

### Added

- Hot reload during development - changes to `.kelvin` files are reflected instantly
- Built-in admin panel with login, list views, and forms
- JWT-based authentication when a `User` entity is defined
- Custom actions with `require` conditions and `then` blocks
- Relationships between entities
- Soft delete pattern support

### Improved

- Better error messages during parsing
- Schema migrations preserve existing data
- VSCode extension with syntax highlighting

### Fixed

- Field validation edge cases
- Date formatting in admin panel

## v0.1.0

**Released:** December 2025

Initial release with core features:

- Declarative entity definitions
- Automatic REST API generation
- SQLite database with sql.js
- Basic CRUD operations
- Field types: text, email, bool, int, money, date, enum
- View-based access control
