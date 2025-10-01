# API Reference

## `defineError(name)<Data>(): class`
Creates a custom error class with a `.tag` and typed `.data`.
Also provides a static `.is(e)` type guard.

## matchError(e)
Free-form matcher; chain `.with()` and `.when()`, then `.otherwise()`.
Returns a matcher object that must end with `.otherwise()`.

## `matchErrorOf<All>(e)`
Exhaustive matcher; chain `.with()`/`.when()` and finish with `.exhaustive()`.
TypeScript enforces that all `All` variants are covered.

## wrap(fn)
Wraps a function to return a `Result<T, E>` instead of throwing.
Returns `{ ok: true, value: T }` on success or `{ ok: false, error: E }` on failure.

## hasCode(code), isError(e)
Utility guards for error matching.
