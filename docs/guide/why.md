# Why & Concepts

TypeScript encourages `catch (e: unknown)` which forces safe narrowing.
`ts-typed-errors` makes it ergonomic to:
- Define domain-specific error classes with typed payloads.
- Match errors exhaustively at compile-time.
- Wrap functions into `Result` for explicit error flows.

Core ideas:
- **defineError**: creates a lightweight branded error with `.tag` and `.data`.
- **matchErrorOf**: enforces handling of all error variants.
- **wrap**: replace exceptions with `{ ok, value | error }`.
