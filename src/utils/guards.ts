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
