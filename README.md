# ts-typed-errors

[![npm version](https://img.shields.io/npm/v/ts-typed-errors.svg?style=flat-square)](https://www.npmjs.com/package/ts-typed-errors)
[![bundle size](https://img.shields.io/bundlephobia/minzip/ts-typed-errors?style=flat-square)](https://bundlephobia.com/package/ts-typed-errors)
[![CI](https://github.com/ackermannQ/ts-typed-errors/actions/workflows/ci.yml/badge.svg)](https://github.com/ackermannQ/ts-typed-errors)

> 🛡️ **Exhaustive error matching for TypeScript** - tiny, dependency-free, type-safe.

```ts
import { defineError, matchErrorOf, wrap } from 'ts-typed-errors';

const NetworkError = defineError('NetworkError')<{ status: number; url: string }>();
const ParseError   = defineError('ParseError')<{ at: string }>();

type Err = InstanceType<typeof NetworkError> | InstanceType<typeof ParseError>;

const safeJson = wrap(async (url: string) => {
  const r = await fetch(url);
  if (!r.ok) throw new NetworkError(`HTTP ${r.status}`, { status: r.status, url });
  try { return await r.json(); }
  catch { throw new ParseError('Invalid JSON', { at: url }); }
});

const res = await safeJson('https://httpstat.us/404');
if (!res.ok) {
  return matchErrorOf<Err>(res.error)
    .with(NetworkError, e => `retry ${e.data.url}`)
    .with(ParseError,   e => `report ${e.data.at}`)
    .exhaustive(); // ✅ TypeScript ensures all cases are covered
}
```

## ✨ Features

- **🎯 Exhaustive matching** - TypeScript enforces that you handle all error types
- **🔧 Ergonomic API** - Declarative `matchError` / `matchErrorOf` chains with `.select()` for property extraction
- **📦 Tiny & fast** - ~1–2 kB, zero dependencies, works everywhere
- **🛡️ Type-safe** - Full TypeScript support with strict type checking
- **🔄 Result pattern** - Convert throwing functions to `Result<T, E>` types

## 🚀 Quick Start

### Installation

```bash
npm install ts-typed-errors
```

### Basic Usage

```ts
import { defineError, matchErrorOf, wrap } from 'ts-typed-errors';

// 1. Define your error types
const NetworkError = defineError('NetworkError')<{ status: number; url: string }>();
const ValidationError = defineError('ValidationError')<{ field: string; value: any }>();

type AppError = InstanceType<typeof NetworkError> | InstanceType<typeof ValidationError>;

// 2. Wrap throwing functions
const safeFetch = wrap(async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new NetworkError(`HTTP ${response.status}`, { 
      status: response.status, 
      url 
    });
  }
  return response.json();
});

// 3. Handle errors exhaustively
const result = await safeFetch('https://api.example.com/data');
if (!result.ok) {
  const message = matchErrorOf<AppError>(result.error)
    .with(NetworkError, e => `Network error: ${e.data.status} for ${e.data.url}`)
    .with(ValidationError, e => `Invalid ${e.data.field}: ${e.data.value}`)
    .exhaustive(); // ✅ Compiler ensures all cases covered
  
  console.log(message);
}
```

## 📚 What is Exhaustive Error Matching?

Since TypeScript 4.4, every `catch` block receives an `unknown` type. This means you need to manually narrow error types with verbose `if/else` blocks:

```ts
// ❌ Verbose and error-prone
try {
  await riskyOperation();
} catch (error) {
  if (error instanceof NetworkError) {
    // handle network error
  } else if (error instanceof ValidationError) {
    // handle validation error
  } else {
    // handle unknown error
  }
}
```

**ts-typed-errors** makes this ergonomic and type-safe:

```ts
// ✅ Clean and exhaustive
const result = await wrap(riskyOperation)();
if (!result.ok) {
  return matchErrorOf<AllErrors>(result.error)
    .with(NetworkError, handleNetwork)
    .with(ValidationError, handleValidation)
    .exhaustive(); // Compiler ensures you handle all cases
}
```

## 🔧 API Reference

### Core Functions

#### `defineError(name)<Data>()`
Creates a typed error class with optional data payload.

```ts
const UserError = defineError('UserError')<{ userId: string; reason: string }>();
const error = new UserError('User not found', { userId: '123', reason: 'deleted' });
// error.tag === 'UserError'
// error.data === { userId: '123', reason: 'deleted' }
```

#### `wrap(fn)`
Converts a throwing function to return `Result<T, E>`.

```ts
const safeJson = wrap(async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error('HTTP error');
  return response.json();
});

const result = await safeJson('https://api.example.com');
if (result.ok) {
  console.log(result.value); // T
} else {
  console.log(result.error); // Error
}
```

#### `matchError(error)`
Free matcher for any error type. Always requires `.otherwise()`.

```ts
const message = matchError(error)
  .with(NetworkError, e => `Network: ${e.data.status}`)
  .with(ValidationError, e => `Validation: ${e.data.field}`)
  .otherwise(e => `Unknown: ${e.message}`);
```

#### `matchErrorOf<AllErrors>(error)`
Exhaustive matcher that ensures all error types are handled.

```ts
type AllErrors = NetworkError | ValidationError | ParseError;

const message = matchErrorOf<AllErrors>(error)
  .with(NetworkError, e => `Network: ${e.data.status}`)
  .with(ValidationError, e => `Validation: ${e.data.field}`)
  .with(ParseError, e => `Parse: ${e.data.at}`)
  .exhaustive(); // ✅ Compiler error if any case missing
```

### Advanced Matching

#### `.select(constructor, key, handler)`
Extract and match on specific properties from error data directly.

```ts
const NetworkError = defineError('NetworkError')<{ status: number; url: string }>();
const ParseError = defineError('ParseError')<{ at: string }>();

// Extract specific property instead of full error object
matchErrorOf<Err>(error)
  .select(NetworkError, 'status', (status) => `Status code: ${status}`)
  .select(ParseError, 'at', (location) => `Parse failed at: ${location}`)
  .exhaustive();

// Mix with regular .with() handlers
matchError(error)
  .select(NetworkError, 'status', (status) => status > 400 ? 'client error' : 'ok')
  .with(ParseError, (e) => `Parse error at ${e.data.at}`)
  .otherwise(() => 'unknown');
```

**Benefits:**
- Cleaner handler signatures
- Direct access to needed properties
- Type-safe property extraction
- Works with exhaustive matching

### Utility Functions

#### `isError(value)`
Type guard to check if a value is an Error instance.

```ts
if (isError(value)) {
  // value is Error
}
```

#### `hasCode(error, code)`
Check if an error has a specific error code.

```ts
if (hasCode(error, 'ENOTFOUND')) {
  // Handle DNS error
}
```

## 🎯 Advanced Examples

### Custom Error Hierarchy

```ts
// Base error with common properties
const BaseError = defineError('BaseError')<{ code: string }>();

// Specific errors extending base
const DatabaseError = defineError('DatabaseError')<{ table: string; operation: string }>();
const AuthError = defineError('AuthError')<{ userId?: string; permission: string }>();

type AppError = InstanceType<typeof DatabaseError> | InstanceType<typeof AuthError>;

// Exhaustive matching with data access
const handleError = (error: AppError) => 
  matchErrorOf<AppError>(error)
    .with(DatabaseError, e => ({
      type: 'database',
      table: e.data.table,
      operation: e.data.operation,
      code: e.data.code
    }))
    .with(AuthError, e => ({
      type: 'auth',
      userId: e.data.userId,
      permission: e.data.permission,
      code: e.data.code
    }))
    .exhaustive();
```

### Result Chaining

```ts
const processUser = async (id: string) => {
  const userResult = await safeGetUser(id);
  if (!userResult.ok) return userResult;
  
  const validateResult = await safeValidateUser(userResult.value);
  if (!validateResult.ok) return validateResult;
  
  const saveResult = await safeSaveUser(validateResult.value);
  return saveResult;
};
```

## 🏗️ Architecture

ts-typed-errors is built around these core concepts:

- **Typed Errors**: Custom error classes with structured data
- **Result Pattern**: Functions return `Result<T, E>` instead of throwing
- **Exhaustive Matching**: Compiler-enforced error handling
- **Zero Dependencies**: Works in any TypeScript environment

## 📖 Documentation

- [Getting Started Guide](./docs/guide/getting-started.md)
- [API Reference](./docs/api/reference.md)
- [Examples](./docs/guide/examples.md)
- [Why ts-typed-errors?](./docs/guide/why.md)


## 📄 License

MIT © [Quentin Ackermann](https://github.com/ackermannQ/ts-typed-errors)
