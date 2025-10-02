import type { ErrorCtor, Guard } from '../core/types';
import { baseMatcher } from './base';

/**
 * Creates a free-form error matcher that allows pattern matching on errors.
 * 
 * This function provides a fluent API for handling different error types with type safety.
 * The matcher must end with a call to `otherwise()` to handle unmatched cases.
 * 
 * @param e - The error to match against
 * @returns A matcher object with methods for pattern matching
 * 
 * @example
 * ```typescript
 * const result = matchError(error)
 *   .with(ValidationError, (err) => `Validation failed: ${err.message}`)
 *   .with(NetworkError, (err) => `Network error: ${err.code}`)
 *   .when(err => err.message.includes('timeout'), (err) => 'Request timed out')
 *   .otherwise((err) => `Unknown error: ${err}`);
 * ```
 */
export function matchError(e: unknown) {
  const m = baseMatcher();
  
  function createChain() {
    return {
      with<T>(ctorOrGuard: ErrorCtor<any> | Guard<any>, handler: (e: HandlerInput<T>) => any) {
        m.with(ctorOrGuard, handler);
        return createChain();
      },
      when(pred: (e: any) => boolean, handler: (e: any) => any) {
        m.when(pred, handler);
        return createChain();
      },
      otherwise<R>(handler: (e: unknown) => R) {
        return m._otherwise(e, handler);
      },
    };
  }
  
  return createChain();
}

/**
 * Infers the input type of a handler constraint.
 * 
 * This utility type extracts the error type that a handler function will receive
 * based on the constructor or guard function provided to `.with()`.
 * 
 * @template T - The error constructor or guard function
 * @returns The inferred error type that the handler will receive
 * 
 * @example
 * ```typescript
 * // For ErrorCtor<MyError>, HandlerInput<typeof MyError> = MyError
 * // For Guard<CustomError>, HandlerInput<typeof guard> = CustomError
 * ```
 */
export type HandlerInput<T> =
  T extends ErrorCtor<infer I> ? I :
  T extends (e: unknown) => e is infer G ? G :
  never;

/**
 * Chain interface for exhaustive error matching with compile-time exhaustiveness checking.
 * 
 * This interface provides methods for pattern matching with TypeScript ensuring
 * that all possible error cases are handled at compile time.
 * 
 * @template Left - The remaining unhandled error types
 */
export interface Matcher<Left> {
  /**
   * Matches an error using a constructor or guard function.
   * 
   * @param ctorOrGuard - Error constructor or type guard function
   * @param handler - Handler function that receives the matched error
   * @returns A new matcher with the remaining unhandled types
   */
  with<T>(ctorOrGuard: ErrorCtor<any> | Guard<any>, handler: (e: HandlerInput<T>) => any): any;
  
  /**
   * Matches an error using a predicate function.
   * 
   * @param pred - Predicate function to test the error
   * @param handler - Handler function for matching errors
   * @returns A new matcher with the same remaining types
   */
  when(pred: (e: any) => boolean, handler: (e: any) => any): any;
  
  /**
   * Completes the matching when all cases are handled.
   * Only callable when Left is never (all cases handled).
   */
  exhaustive(this: Matcher<never>): any;
  
  /**
   * Handles any remaining unmatched cases.
   * 
   * @param handler - Handler for unmatched errors
   * @returns The result of the handler
   */
  otherwise<R>(handler: (e: unknown) => R): R;
}

/**
 * Helper type computing remaining (unhandled) error cases.
 * 
 * This utility type removes the handled error type from the union of all possible errors,
 * helping TypeScript track which cases still need to be handled.
 * 
 * @template Left - The union of all possible error types
 * @template T - The error constructor or guard that was just handled
 * @returns The remaining unhandled error types
 */
export type Next<Left, T> = Exclude<Left, HandlerInput<T>>;

/**
 * Creates an exhaustive error matcher with compile-time exhaustiveness checking.
 * 
 * This function provides type-safe pattern matching where TypeScript ensures
 * all possible error cases are handled. Use `.exhaustive()` when all cases are covered,
 * or `.otherwise()` for a fallback handler.
 * 
 * @template All - The union type of all possible error types
 * @param e - The error to match against
 * @returns A matcher that tracks remaining unhandled cases
 * 
 * @example
 * ```typescript
 * type AppError = ValidationError | NetworkError | AuthError;
 * 
 * const result = matchErrorOf<AppError>(error)
 *   .with(ValidationError, (err) => handleValidation(err))
 *   .with(NetworkError, (err) => handleNetwork(err))
 *   .with(AuthError, (err) => handleAuth(err))
 *   .exhaustive(); // TypeScript ensures all cases are handled
 * ```
 */
export function matchErrorOf<All>(e: unknown): Matcher<All> {
  const m = baseMatcher<any>();
  function api<L>(): Matcher<L> {
    return {
      with<T>(ctorOrGuard: any, handler: any) {
        m.with(ctorOrGuard, handler);
        return api<Next<L, T>>();
      },
      when(pred: any, handler: any) {
        m.when(pred, handler);
        return api<L>();
      },
      exhaustive(this: Matcher<never>) {
        return m._exhaustive(e);
      },
      otherwise<R>(handler: (e: unknown) => R) {
        return m._otherwise(e, handler);
      },
    };
  }
  return api<All>();
}
