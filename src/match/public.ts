import type { ErrorCtor, Guard } from '../core/types';
import { baseMatcher, baseAsyncMatcher } from './base';

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
  let transformedError = e;

  function createChain() {
    return {
      map(transform: (e: unknown) => unknown) {
        transformedError = transform(transformedError);
        return createChain();
      },
      with<T>(ctorOrGuard: ErrorCtor<any> | Guard<any>, handler: (e: HandlerInput<T>) => any) {
        m.with(ctorOrGuard, handler);
        return createChain();
      },
      withAny<T extends Error>(ctors: ErrorCtor<T>[], handler: (e: T) => any) {
        m.withAny(ctors, handler);
        return createChain();
      },
      withNot<T extends Error>(ctors: ErrorCtor<T> | ErrorCtor<T>[], handler: (e: any) => any) {
        m.withNot(ctors, handler);
        return createChain();
      },
      select<C extends ErrorCtor<any>, K extends keyof ErrorData<C> & string>(
        ctor: C,
        key: K,
        handler: (value: SelectValue<C, K>) => any
      ) {
        m.select(ctor, key, handler);
        return createChain();
      },
      when(pred: (e: any) => boolean, handler: (e: any) => any) {
        m.when(pred, handler);
        return createChain();
      },
      otherwise<R>(handler: (e: unknown) => R) {
        return m._otherwise(transformedError, handler);
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
 * Extracts the data type from an error constructor.
 *
 * This utility type extracts the type of the `data` property from an error
 * created by `defineError`. If the error doesn't have a `data` property, it returns `unknown`.
 *
 * @template T - The error constructor
 * @returns The type of the error's data property
 */
export type ErrorData<T> = T extends ErrorCtor<infer E>
  ? E extends { data: infer D }
    ? D
    : unknown
  : unknown;

/**
 * Extracts the type of a specific property from error data.
 *
 * This utility type extracts the type of a specific key from an error's data object.
 *
 * @template T - The error constructor
 * @template K - The property key to extract
 * @returns The type of the specified property
 */
export type SelectValue<T, K extends string> = ErrorData<T> extends Record<K, infer V> ? V : unknown;

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
   * Transforms the error before matching.
   *
   * @param transform - Function to transform the error
   * @returns The same matcher with the transformed error
   */
  map(transform: (e: unknown) => unknown): any;

  /**
   * Matches an error using a constructor or guard function.
   *
   * @param ctorOrGuard - Error constructor or type guard function
   * @param handler - Handler function that receives the matched error
   * @returns A new matcher with the remaining unhandled types
   */
  with<T>(ctorOrGuard: ErrorCtor<any> | Guard<any>, handler: (e: HandlerInput<T>) => any): any;

  /**
   * Matches multiple error types with the same handler.
   *
   * @param ctors - Array of error constructors to match
   * @param handler - Handler function that receives the matched error
   * @returns A new matcher with the remaining unhandled types
   */
  withAny<T extends Error>(ctors: ErrorCtor<T>[], handler: (e: T) => any): any;

  /**
   * Matches all errors except the specified types.
   *
   * @param ctors - Error constructor or array of constructors to exclude
   * @param handler - Handler function for non-matching errors
   * @returns A new matcher with the same remaining types
   */
  withNot<T extends Error>(ctors: ErrorCtor<T> | ErrorCtor<T>[], handler: (e: any) => any): any;

  /**
   * Matches an error and extracts a specific property from its data.
   *
   * @param ctor - Error constructor to match
   * @param key - Property key to extract from error.data
   * @param handler - Handler function that receives only the extracted property value
   * @returns A new matcher with the remaining unhandled types
   */
  select<C extends ErrorCtor<any>, K extends keyof ErrorData<C> & string>(
    ctor: C,
    key: K,
    handler: (value: SelectValue<C, K>) => any
  ): any;

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
  let transformedError = e;

  function api<L>(): Matcher<L> {
    return {
      map(transform: (e: unknown) => unknown) {
        transformedError = transform(transformedError);
        return api<L>();
      },
      with<T>(ctorOrGuard: any, handler: any) {
        m.with(ctorOrGuard, handler);
        return api<Next<L, T>>();
      },
      withAny<T extends Error>(ctors: ErrorCtor<T>[], handler: (e: T) => any) {
        m.withAny(ctors, handler);
        // For withAny, we need to remove all matched types from the union
        type Remaining = Exclude<L, InstanceType<typeof ctors[number]>>;
        return api<Remaining>();
      },
      withNot<T extends Error>(ctors: ErrorCtor<T> | ErrorCtor<T>[], handler: (e: any) => any) {
        m.withNot(ctors, handler);
        // withNot doesn't remove types from the union since it matches everything else
        return api<L>();
      },
      select<C extends ErrorCtor<any>, K extends keyof ErrorData<C> & string>(
        ctor: C,
        key: K,
        handler: (value: SelectValue<C, K>) => any
      ) {
        m.select(ctor, key, handler);
        return api<Next<L, HandlerInput<C>>>();
      },
      when(pred: any, handler: any) {
        m.when(pred, handler);
        return api<L>();
      },
      exhaustive(this: Matcher<never>) {
        return m._exhaustive(transformedError);
      },
      otherwise<R>(handler: (e: unknown) => R) {
        return m._otherwise(transformedError, handler);
      },
    };
  }
  return api<All>();
}

/**
 * Creates a free-form async error matcher with native async/await support.
 *
 * All handlers must return Promises, and the matcher itself returns a Promise
 * that resolves when the matched handler completes.
 *
 * @param e - The error to match against
 * @returns An async matcher object with methods for pattern matching
 *
 * @example
 * ```typescript
 * const result = await matchErrorAsync(error)
 *   .with(NetworkError, async (err) => {
 *     await logToService(err);
 *     return `Logged network error: ${err.data.status}`;
 *   })
 *   .with(ParseError, async (err) => {
 *     await notifyAdmin(err);
 *     return `Notified admin about parse error`;
 *   })
 *   .otherwise(async (err) => `Unknown error: ${err}`);
 * ```
 */
export function matchErrorAsync(e: unknown) {
  const m = baseAsyncMatcher();
  let transformedError = e;

  function createChain() {
    return {
      map(transform: (e: unknown) => unknown) {
        transformedError = transform(transformedError);
        return createChain();
      },
      with<T>(ctorOrGuard: ErrorCtor<any> | Guard<any>, handler: (e: HandlerInput<T>) => Promise<any>) {
        m.with(ctorOrGuard, handler);
        return createChain();
      },
      withAny<T extends Error>(ctors: ErrorCtor<T>[], handler: (e: T) => Promise<any>) {
        m.withAny(ctors, handler);
        return createChain();
      },
      withNot<T extends Error>(ctors: ErrorCtor<T> | ErrorCtor<T>[], handler: (e: any) => Promise<any>) {
        m.withNot(ctors, handler);
        return createChain();
      },
      select<C extends ErrorCtor<any>, K extends keyof ErrorData<C> & string>(
        ctor: C,
        key: K,
        handler: (value: SelectValue<C, K>) => Promise<any>
      ) {
        m.select(ctor, key, handler);
        return createChain();
      },
      when(pred: (e: any) => boolean, handler: (e: any) => Promise<any>) {
        m.when(pred, handler);
        return createChain();
      },
      otherwise<R>(handler: (e: unknown) => Promise<R>) {
        return m._otherwise(transformedError, handler);
      },
    };
  }

  return createChain();
}

/**
 * Creates an exhaustive async error matcher with compile-time exhaustiveness checking.
 *
 * All handlers must return Promises. Use `.exhaustive()` when all cases are covered.
 *
 * @template All - The union type of all possible error types
 * @param e - The error to match against
 * @returns An async matcher that tracks remaining unhandled cases
 *
 * @example
 * ```typescript
 * type AppError = ValidationError | NetworkError | AuthError;
 *
 * const result = await matchErrorOfAsync<AppError>(error)
 *   .with(ValidationError, async (err) => {
 *     await validateAndLog(err);
 *     return 'validation';
 *   })
 *   .with(NetworkError, async (err) => {
 *     await retryRequest(err);
 *     return 'retried';
 *   })
 *   .with(AuthError, async (err) => {
 *     await refreshToken(err);
 *     return 'refreshed';
 *   })
 *   .exhaustive(); // TypeScript ensures all cases are handled
 * ```
 */
export function matchErrorOfAsync<All>(e: unknown): AsyncMatcher<All> {
  const m = baseAsyncMatcher<any>();
  let transformedError = e;

  function api<L>(): AsyncMatcher<L> {
    return {
      map(transform: (e: unknown) => unknown) {
        transformedError = transform(transformedError);
        return api<L>();
      },
      with<T>(ctorOrGuard: any, handler: any) {
        m.with(ctorOrGuard, handler);
        return api<Next<L, T>>();
      },
      withAny<T extends Error>(ctors: ErrorCtor<T>[], handler: (e: T) => Promise<any>) {
        m.withAny(ctors, handler);
        type Remaining = Exclude<L, InstanceType<typeof ctors[number]>>;
        return api<Remaining>();
      },
      withNot<T extends Error>(ctors: ErrorCtor<T> | ErrorCtor<T>[], handler: (e: any) => Promise<any>) {
        m.withNot(ctors, handler);
        return api<L>();
      },
      select<C extends ErrorCtor<any>, K extends keyof ErrorData<C> & string>(
        ctor: C,
        key: K,
        handler: (value: SelectValue<C, K>) => Promise<any>
      ) {
        m.select(ctor, key, handler);
        return api<Next<L, HandlerInput<C>>>();
      },
      when(pred: any, handler: any) {
        m.when(pred, handler);
        return api<L>();
      },
      exhaustive(this: AsyncMatcher<never>) {
        return m._exhaustive(transformedError);
      },
      otherwise<R>(handler: (e: unknown) => Promise<R>) {
        return m._otherwise(transformedError, handler);
      },
    };
  }
  return api<All>();
}

/**
 * Async matcher interface with compile-time exhaustiveness checking.
 *
 * @template Left - The remaining unhandled error types
 */
export interface AsyncMatcher<Left> {
  map(transform: (e: unknown) => unknown): any;
  with<T>(ctorOrGuard: ErrorCtor<any> | Guard<any>, handler: (e: HandlerInput<T>) => Promise<any>): any;
  withAny<T extends Error>(ctors: ErrorCtor<T>[], handler: (e: T) => Promise<any>): any;
  withNot<T extends Error>(ctors: ErrorCtor<T> | ErrorCtor<T>[], handler: (e: any) => Promise<any>): any;
  select<C extends ErrorCtor<any>, K extends keyof ErrorData<C> & string>(
    ctor: C,
    key: K,
    handler: (value: SelectValue<C, K>) => Promise<any>
  ): any;
  when(pred: (e: any) => boolean, handler: (e: any) => Promise<any>): any;
  exhaustive(this: AsyncMatcher<never>): Promise<any>;
  otherwise<R>(handler: (e: unknown) => Promise<R>): Promise<R>;
}
