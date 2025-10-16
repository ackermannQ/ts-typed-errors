# ts-typed-errors Roadmap

This roadmap outlines potential features and improvements for ts-typed-errors, inspired by ts-pattern and other pattern matching libraries.

## 🎯 Priority Levels
- 🔴 **High Priority** - High impact, relatively easy to implement
- 🟡 **Medium Priority** - Good value but requires more work
- 🟢 **Low Priority** - Nice to have, less critical

---

## 🚀 Planned Features

### 🔴 1. Type Guard Builder - `isErrorOf()`

**Inspiration:** ts-pattern's `isMatching()`

**Description:** Create reusable type guards for error types with optional predicates.

**API:**
```ts
import { isErrorOf } from 'ts-typed-errors';

const NetworkError = defineError('NetworkError')<{ status: number; url: string }>();

// Simple type guard
const isNetworkError = isErrorOf(NetworkError);

// Type guard with predicate
const isServerError = isErrorOf(NetworkError, (e) => e.data.status >= 500);
const isClientError = isErrorOf(NetworkError, (e) => e.data.status >= 400 && e.data.status < 500);

// Usage in code
if (isServerError(error)) {
  // TypeScript knows error is NetworkError with status >= 500
  console.log(`Server error: ${error.data.status}`);
}
```

**Benefits:**
- Reusable type guards
- Composable error checks
- Better code organization
- Reduced duplication

**Implementation complexity:** Low
**Impact:** High

---

### 🔴 2. Property Selection - `select()`

**Inspiration:** ts-pattern's `P.select()`

**Description:** Extract specific properties from error data directly in the handler.

**API Option 1: Method chaining**
```ts
matchErrorOf<Err>(error)
  .select(NetworkError, 'status', (status) => `Retry with status: ${status}`)
  .select(ParseError, 'at', (location) => `Parse failed at: ${location}`)
  .exhaustive();
```

**API Option 2: Handler parameter**
```ts
matchErrorOf<Err>(error)
  .with(NetworkError, { select: 'status' }, (status) => `Status: ${status}`)
  .with(ParseError, { select: ['at', 'message'] }, ({ at, message }) => `${message} at ${at}`)
  .exhaustive();
```

**API Option 3: Inline extraction**
```ts
matchErrorOf<Err>(error)
  .with(NetworkError, (e) => e.data.status, (status) => `Status: ${status}`)
  .exhaustive();
```

**Benefits:**
- Cleaner handler signatures
- Direct access to needed properties
- Less verbose code
- Better composability

**Implementation complexity:** Medium
**Impact:** High

---

### 🟡 3. Negation Pattern - `withNot()`

**Inspiration:** ts-pattern's `P.not()`

**Description:** Match all cases except specific error types.

**API:**
```ts
matchErrorOf<Err>(error)
  .withNot(NetworkError, (e) => `Handle any error except NetworkError`)
  .exhaustive();

// Or with multiple exclusions
matchError(error)
  .withNot([NetworkError, ParseError], (e) => `Neither network nor parse error`)
  .otherwise((e) => 'Fallback');
```

**Benefits:**
- Handle "everything except X" scenarios
- Reduce boilerplate for common cases
- More expressive API

**Implementation complexity:** Low
**Impact:** Medium

---

### 🟡 4. Multiple Pattern Matching

**Inspiration:** ts-pattern's multiple patterns in single `.with()`

**Description:** Match multiple error types with the same handler.

**API:**
```ts
matchErrorOf<Err>(error)
  .withAny([NetworkError, TimeoutError], (e) => `Connection issue: ${e.message}`)
  .with(ParseError, (e) => `Parse error at ${e.data.at}`)
  .exhaustive();
```

**Benefits:**
- DRY principle
- Handle similar errors together
- Cleaner code for common handlers

**Implementation complexity:** Low
**Impact:** Medium

---

### 🟡 5. Complex Structure Matching

**Inspiration:** ts-pattern's `P.shape()` and `P.array()`

**Description:** Pattern match on complex error structures (useful for aggregate errors).

**API:**
```ts
const AggregateError = defineError('AggregateError')<{ errors: Error[] }>();
const ValidationError = defineError('ValidationError')<{ fields: string[] }>();

matchErrorOf<AppError>(error)
  .with(AggregateError, {
    shape: {
      errors: (errs) => errs.every(e => e instanceof ValidationError)
    }
  }, (e) => 'All validation errors')
  .with(AggregateError, {
    shape: {
      errors: (errs) => errs.some(e => e instanceof NetworkError)
    }
  }, (e) => 'Contains network errors')
  .exhaustive();
```

**Benefits:**
- Handle nested error structures
- Match on array patterns
- Support for aggregate errors
- More powerful matching capabilities

**Implementation complexity:** High
**Impact:** Medium

---

### 🔴 6. Better IntelliSense Documentation

**Description:** Improve IDE autocomplete and hover documentation.

**Implementation:**
- Add more detailed JSDoc comments
- Include usage examples in JSDoc
- Document common patterns
- Add `@example` tags to all public APIs

**Benefits:**
- Better developer experience
- Faster onboarding
- Less context switching to docs

**Implementation complexity:** Low
**Impact:** High

---

### 🟢 7. Error Transformation - `map()`

**Description:** Transform errors before matching.

**API:**
```ts
matchErrorOf<Err>(error)
  .map((e) => {
    // Add context or transform before matching
    return e instanceof NetworkError 
      ? new EnrichedNetworkError(e.message, { ...e.data, timestamp: Date.now() })
      : e;
  })
  .with(EnrichedNetworkError, (e) => `Error at ${e.data.timestamp}`)
  .exhaustive();
```

**Benefits:**
- Pre-process errors
- Add context before matching
- Transform error types

**Implementation complexity:** Medium
**Impact:** Low

---

### 🟢 8. Partial Matching with Defaults

**Description:** Allow partial matching with default handlers for groups.

**API:**
```ts
matchError(error)
  .withDefault([NetworkError, TimeoutError], (e) => 'Connection issue')
  .with(NetworkError, { status: 404 }, (e) => 'Not found')
  .with(NetworkError, { status: 500 }, (e) => 'Server error')
  .otherwise((e) => 'Unknown error');
```

**Benefits:**
- Default handlers for error groups
- Override specific cases
- Fallback behavior

**Implementation complexity:** Medium
**Impact:** Low

---

### 🟡 9. Error Composition Utilities

**Description:** Utilities to compose and combine errors.

**API:**
```ts
import { combineErrors, isAnyOf, isAllOf } from 'ts-typed-errors';

// Check if error is one of several types
if (isAnyOf(error, [NetworkError, TimeoutError])) {
  // Handle connection errors
}

// Combine multiple errors
const combined = combineErrors([error1, error2, error3]);

// Create error hierarchies
const DatabaseError = defineError('DatabaseError')<{ query: string }>();
const ConnectionError = DatabaseError.extend('ConnectionError')<{ host: string }>();
```

**Benefits:**
- Better error organization
- Error hierarchies
- Bulk error handling

**Implementation complexity:** High
**Impact:** Medium

---

### 🟡 10. Async Error Matching

**Description:** Support for async handlers in match expressions.

**API:**
```ts
await matchErrorOf<Err>(error)
  .with(NetworkError, async (e) => {
    await logToService(e);
    return 'Logged network error';
  })
  .with(ParseError, async (e) => {
    await notifyAdmin(e);
    return 'Notified admin';
  })
  .exhaustive();
```

**Benefits:**
- Native async/await support
- Cleaner async error handling
- No need for wrapper functions

**Implementation complexity:** Medium
**Impact:** Medium

---

### 🟢 11. Error Recovery Patterns

**Description:** Built-in patterns for common error recovery strategies.

**API:**
```ts
import { retry, fallback, ignore } from 'ts-typed-errors';

matchErrorOf<Err>(error)
  .with(NetworkError, retry(3, exponentialBackoff))
  .with(ValidationError, fallback(defaultValue))
  .with(ParseError, ignore())
  .exhaustive();
```

**Benefits:**
- Common recovery patterns
- Less boilerplate
- Standardized error handling

**Implementation complexity:** High
**Impact:** Low

---

### 🟢 12. Performance Optimizations

**Description:** Optimize matching performance for large error unions.

**Ideas:**
- Cache instanceof checks
- Use lookup tables for tag-based matching
- Lazy evaluation of predicates
- Benchmark and optimize hot paths

**Benefits:**
- Faster error matching
- Better runtime performance
- Scalable for large projects

**Implementation complexity:** Medium
**Impact:** Low (unless performance is critical)

---

### 🟡 13. Error Context Propagation

**Description:** Automatically propagate context through error chains.

**API:**
```ts
const withContext = (context: Record<string, any>) => {
  return {
    wrap: (fn: Function) => {
      // Automatically add context to all thrown errors
    }
  };
};

const { wrap } = withContext({ requestId: '123', userId: 'abc' });
const result = await wrap(riskyOperation)();
// All errors will have requestId and userId in their context
```

**Benefits:**
- Automatic context tracking
- Better debugging
- Request tracing

**Implementation complexity:** High
**Impact:** Medium

---

### 🟢 14. Plugin System

**Description:** Allow extensions via plugins.

**API:**
```ts
import { plugin } from 'ts-typed-errors';

plugin.register('logger', {
  onMatch: (error, handler) => {
    console.log(`Matched ${error.tag}`);
  },
  onMiss: (error) => {
    console.log(`No match for ${error}`);
  }
});
```

**Benefits:**
- Extensibility
- Third-party integrations
- Custom behaviors

**Implementation complexity:** High
**Impact:** Low

---

### 🟡 15. Better Error Serialization

**Description:** Utilities for serializing/deserializing errors.

**API:**
```ts
import { serialize, deserialize } from 'ts-typed-errors';

// Serialize for API responses
const serialized = serialize(error);
// { tag: 'NetworkError', message: '...', data: {...}, stack: '...' }

// Deserialize from API
const error = deserialize(serialized, [NetworkError, ParseError]);
```

**Benefits:**
- API error handling
- Error logging
- Error transmission

**Implementation complexity:** Medium
**Impact:** Medium

---

## 📊 Implementation Timeline

### Phase 1: Quick Wins (v0.1.0) - ✅ COMPLETED
- ✅ `isErrorOf()` type guard builder - Reusable type guards with optional predicates
- ✅ `withNot()` negation pattern - Match everything except specified types
- ✅ `withAny()` multiple pattern matching - Match multiple types with same handler
- ✅ Better IntelliSense documentation - Comprehensive JSDoc on all public APIs

### Phase 2: Core Features (v0.2.0) - ✅ COMPLETED
- ✅ Property selection (`select()`) - Type-safe property extraction from error data
- ✅ Error composition utilities - `isAnyOf`, `isAllOf` for composing type guards
- ✅ Async error matching - `matchErrorAsync`, `matchErrorOfAsync` with native async/await
- ⚠️ Complex structure matching - DEFERRED (low priority, high complexity)

### Phase 3: Advanced Features (v0.3.0) - ✅ COMPLETED
- ✅ Error serialization - `serialize`, `deserialize`, `toJSON`, `fromJSON` utilities
- ✅ Error transformation - `map()` to transform errors before matching
- ✅ Performance optimizations - Tag-based lookup tables for O(1) matching
- ⚠️ Error context propagation - DEFERRED (complex, requires more design work)

### Phase 4: Ecosystem (v1.0.0)
- 📅 Plugin system - Allow extensions via plugins
- 📅 Error recovery patterns - Built-in retry, fallback, ignore patterns
- 📅 Framework integrations - Express, Next.js, Hono middleware

---

## 🤝 Contributing

Have ideas for other features? Open an issue or PR on GitHub!

## 📝 Notes

This roadmap is subject to change based on:
- Community feedback
- Real-world usage patterns
- TypeScript language updates
- Performance considerations

**Last updated:** October 16, 2025
**Current version:** v0.3.0

