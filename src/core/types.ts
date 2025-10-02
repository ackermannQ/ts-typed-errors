/**
 * Represents an error constructor function.
 * 
 * This type describes any constructor that creates instances of Error or its subclasses.
 * Used in pattern matching to identify error types by their constructor.
 * 
 * @template T - The specific error type that this constructor creates
 */
export type ErrorCtor<T extends Error = Error> = new (...args: any[]) => T;

/**
 * Represents a type guard function.
 * 
 * This type describes functions that can narrow unknown values to specific types
 * through runtime type checking. Used in pattern matching for custom type guards.
 * 
 * @template T - The type that this guard can identify
 */
export type Guard<T> = (e: unknown) => e is T;

/**
 * Type guard that checks if a value is an error constructor.
 * 
 * This utility function determines whether a given value is a constructor
 * that creates Error instances, useful for runtime type checking.
 * 
 * @param fn - The value to check
 * @returns True if the value is an error constructor
 */
export const isCtor = (fn: any): fn is ErrorCtor<any> =>
  typeof fn === 'function' && fn.prototype instanceof Error;

/**
 * Represents the result of an operation that might fail.
 * 
 * This is a discriminated union type that explicitly represents success or failure,
 * avoiding the need for exceptions and making error handling more predictable.
 * 
 * @template T - The type of the successful value
 * @template E - The type of the error (defaults to unknown)
 * 
 * @example
 * ```typescript
 * const result: Result<string> = await safeOperation();
 * 
 * if (result.ok) {
 *   console.log('Success:', result.value); // TypeScript knows this is string
 * } else {
 *   console.error('Failed:', result.error); // TypeScript knows this is unknown
 * }
 * ```
 */
export type Result<T, E = unknown> =
  | { ok: true; value: T }
  | { ok: false; error: E };
