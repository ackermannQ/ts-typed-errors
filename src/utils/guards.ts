import type { ErrorCtor } from '../core/types';

/**
 * Various guards and predicates useful when matching errors.
 *
 * These utility functions provide type guards for common error patterns,
 * making it easier to safely narrow unknown error types in pattern matching.
 */

/**
 * Type guard that narrows an unknown value to an Error-like object.
 * 
 * This guard checks if a value has the basic structure of an Error,
 * including both native Error instances and plain objects with error-like properties.
 * 
 * @param e - The value to check
 * @returns True if the value is Error-like
 * 
 * @example
 * ```typescript
 * if (isError(unknownValue)) {
 *   console.log(unknownValue.message); // TypeScript knows this is an Error
 * }
 * 
 * // Works with pattern matching
 * matchError(error)
 *   .with(isError, (err) => `Error: ${err.message}`)
 *   .otherwise((val) => `Not an error: ${val}`);
 * ```
 */
export const isError = (e: unknown): e is Error =>
  e instanceof Error || (typeof e === 'object' && e !== null && 'name' in (e as any) && 'message' in (e as any));

/**
 * Creates a type guard for errors with a specific code property.
 * 
 * This is particularly useful for Node.js-style errors that include a `code` property,
 * such as filesystem errors, network errors, or other system-level errors.
 * 
 * @template C - The type of the code to match
 * @param code - The specific code value to match
 * @returns A type guard function that checks for the specified code
 * 
 * @example
 * ```typescript
 * const isNotFoundError = hasCode('ENOENT');
 * const isPermissionError = hasCode('EACCES');
 * 
 * if (isNotFoundError(error)) {
 *   console.log('File not found:', error.code); // TypeScript knows code is 'ENOENT'
 * }
 * 
 * // Use in pattern matching
 * matchError(error)
 *   .with(hasCode('ENOENT'), (err) => 'File not found')
 *   .with(hasCode('EACCES'), (err) => 'Permission denied')
 *   .otherwise((err) => 'Other error');
 * ```
 */
export const hasCode = <C extends string | number>(code: C) =>
  (e: unknown): e is Error & { code: C } =>
    typeof e === 'object' && e !== null && (e as any).code === code;

/**
 * Creates a reusable type guard for a specific error type with optional predicate.
 *
 * This function allows you to build composable type guards for your custom error types,
 * optionally filtering by additional conditions. It's inspired by ts-pattern's `isMatching()`.
 *
 * @template T - The error type that this guard will check for
 * @param ctor - The error constructor to match against
 * @param predicate - Optional predicate function to further refine the match
 * @returns A type guard function that checks if a value is an instance of the error type
 *
 * @example
 * ```typescript
 * const NetworkError = defineError('NetworkError')<{ status: number; url: string }>();
 *
 * // Simple type guard
 * const isNetworkError = isErrorOf(NetworkError);
 * if (isNetworkError(error)) {
 *   console.log(error.data.status); // TypeScript knows this is NetworkError
 * }
 *
 * // Type guard with predicate
 * const isServerError = isErrorOf(NetworkError, (e) => e.data.status >= 500);
 * const isClientError = isErrorOf(NetworkError, (e) => e.data.status >= 400 && e.data.status < 500);
 *
 * if (isServerError(error)) {
 *   // TypeScript knows error is NetworkError with status >= 500
 *   console.log(`Server error: ${error.data.status}`);
 * }
 *
 * // Use in pattern matching
 * matchError(error)
 *   .with(isServerError, (e) => 'Retry server error')
 *   .with(isClientError, (e) => 'Handle client error')
 *   .otherwise(() => 'Other error');
 * ```
 */
export function isErrorOf<T extends Error>(
  ctor: ErrorCtor<T>,
  predicate?: (e: T) => boolean
): (e: unknown) => e is T {
  return (e: unknown): e is T => {
    if (!(e instanceof ctor)) return false;
    if (predicate && !predicate(e as T)) return false;
    return true;
  };
}

/**
 * Checks if an error is an instance of any of the provided error constructors.
 *
 * This utility function provides a convenient way to check if an error belongs
 * to one of several error types without chaining multiple instanceof checks.
 *
 * @template T - The union type of all error constructors
 * @param error - The error to check
 * @param ctors - Array of error constructors to check against
 * @returns True if the error is an instance of any of the provided constructors
 *
 * @example
 * ```typescript
 * const NetworkError = defineError('NetworkError')<{ status: number }>();
 * const TimeoutError = defineError('TimeoutError')<{ duration: number }>();
 *
 * if (isAnyOf(error, [NetworkError, TimeoutError])) {
 *   // Handle connection-related errors
 *   console.log('Connection issue detected');
 * }
 *
 * // More concise than:
 * if (error instanceof NetworkError || error instanceof TimeoutError) {
 *   // ...
 * }
 * ```
 */
export function isAnyOf<T extends readonly ErrorCtor<any>[]>(
  error: unknown,
  ctors: T
): error is InstanceType<T[number]> {
  return ctors.some(ctor => error instanceof ctor);
}

/**
 * Checks if a value matches all of the provided type guards.
 *
 * This utility function allows you to combine multiple type guards,
 * ensuring that a value satisfies all of them.
 *
 * @param value - The value to check
 * @param guards - Array of type guard functions
 * @returns True if the value passes all guards
 *
 * @example
 * ```typescript
 * const NetworkError = defineError('NetworkError')<{ status: number; url: string }>();
 *
 * const isServerError = isErrorOf(NetworkError, (e) => e.data.status >= 500);
 * const hasRetryableStatus = (e: unknown): e is any =>
 *   isError(e) && 'status' in e && [502, 503, 504].includes((e as any).status);
 *
 * if (isAllOf(error, [isServerError, hasRetryableStatus])) {
 *   // Error is both a server error AND has a retryable status
 *   console.log('Retrying server error');
 * }
 * ```
 */
export function isAllOf<T>(
  value: unknown,
  guards: Array<(v: unknown) => v is T>
): value is T {
  return guards.every(guard => guard(value));
}
