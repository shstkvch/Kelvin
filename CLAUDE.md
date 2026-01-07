# Claude instructions

Kelvin is a language in development created to make it much faster to build CRUD apps. 

ALWAYS use test driven development - write the tests before writing the code. You can test your code in different ways, ie bash scripts, testing frameworks, or using the browser for functional testing.

The spec in `kelvin-spec.md` is very important - it's a living document. As we work, we may decide to make significant changes to how the language works. You **must** keep this spec updated when you make any code changes, it must always be an accurate reflection of the language at its current point in development.

## Preferred tools
Use these tools when necessary:

* Tailwind
* Alpine.js
* Node.js

## Code style

Write clean, modern code that can be understood by other developers. 

## Intellisense/VSCode extension

There is a vscode extension for the project that lives in ./vscode-kelvin. It is also documented extensively in specification.md.

When making changes to the codebase, eg adding a new language feature or changing some syntax, be careful to update the VSCode spec and the extension itself so it remains consistent.