import type { Result } from './types';

/**
 * Wraps a function to return a Result type instead of throwing errors.
 * 
 * This utility converts any function that might throw into a function that
 * returns a Result type, making error handling explicit and type-safe.
 * 
 * @template A - The argument types of the wrapped function
 * @template R - The return type of the wrapped function
 * @param fn - The function to wrap (can be sync or async)
 * @returns A new function that returns a Result<R> instead of throwing
 * 
 * @example
 * ```typescript
 * // Wrap a function that might throw
 * const safeParse = wrap(JSON.parse);
 * const result = await safeParse('{"valid": "json"}');
 * 
 * if (result.ok) {
 *   console.log(result.value); // TypeScript knows this is the parsed object
 * } else {
 *   console.error('Parse failed:', result.error);
 * }
 * 
 * // Works with async functions too
 * const safeFetch = wrap(async (url: string) => {
 *   const response = await fetch(url);
 *   if (!response.ok) throw new Error(`HTTP ${response.status}`);
 *   return response.json();
 * });
 * ```
 */
export function wrap<A extends any[], R>(
  fn: (...args: A) => Promise<R> | R
) {
  return async (...args: A): Promise<Result<R>> => {
    try {
      const v = await fn(...args);
      return { ok: true, value: v };
    } catch (e) {
      return { ok: false, error: e };
    }
  };
}
