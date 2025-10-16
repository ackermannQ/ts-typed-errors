import type { ErrorCtor, Guard } from '../core/types';
import { isCtor } from '../core/types';

/** Internal case representation */
interface CaseRunner<R> { test: (e: unknown) => boolean; run: (e: any) => R }

/** Internal async case representation */
interface AsyncCaseRunner<R> { test: (e: unknown) => boolean; run: (e: any) => Promise<R> }

/** Core builder for matchers */
export function baseMatcher<R = any>() {
  const cases: CaseRunner<R>[] = [];
  // Optimization: lookup table for tag-based matching
  const tagHandlers: Map<string, (e: any) => R> = new Map();
  let hasTagHandlers = false;

  function withGuard<T>(guard: Guard<T>, handler: (e: T) => R) {
    cases.push({ test: guard as any, run: handler as any });
    return api;
  }
  function withCtor<T extends Error>(ctor: ErrorCtor<T>, handler: (e: T) => R) {
    // Optimization: if the constructor has a static tag/name, use tag-based lookup
    const tag = (ctor as any).prototype?.tag;
    if (tag && typeof tag === 'string') {
      tagHandlers.set(tag, handler as any);
      hasTagHandlers = true;
    }
    cases.push({ test: (e) => e instanceof ctor, run: handler as any });
    return api;
  }
  function selectCtor<T extends Error, K extends string>(
    ctor: ErrorCtor<T>,
    key: K,
    handler: (value: any) => R
  ) {
    cases.push({
      test: (e) => e instanceof ctor,
      run: (e: any) => {
        const value = (e as any).data?.[key];
        return handler(value);
      }
    });
    return api;
  }
  function withAnyCtor<T extends Error>(ctors: ErrorCtor<T>[], handler: (e: T) => R) {
    cases.push({
      test: (e) => ctors.some(ctor => e instanceof ctor),
      run: handler as any
    });
    return api;
  }
  function withNotCtor<T extends Error>(ctors: ErrorCtor<T> | ErrorCtor<T>[], handler: (e: any) => R) {
    const ctorArray = Array.isArray(ctors) ? ctors : [ctors];
    cases.push({
      test: (e) => !ctorArray.some(ctor => e instanceof ctor),
      run: handler as any
    });
    return api;
  }
  function when(pred: (e: any) => boolean, handler: (e: any) => R) {
    cases.push({ test: pred, run: handler });
    return api;
  }
  function otherwise(e: unknown, fallback: (e: unknown) => R): R {
    // Fast path: try tag-based lookup first
    if (hasTagHandlers && typeof e === 'object' && e !== null && 'tag' in e) {
      const handler = tagHandlers.get((e as any).tag);
      if (handler) return handler(e);
    }
    // Fallback: iterate through cases
    for (const c of cases) if (c.test(e)) return c.run(e);
    return fallback(e);
  }
  function runExhaustive(e: unknown): R {
    // Fast path: try tag-based lookup first
    if (hasTagHandlers && typeof e === 'object' && e !== null && 'tag' in e) {
      const handler = tagHandlers.get((e as any).tag);
      if (handler) return handler(e);
    }
    // Fallback: iterate through cases
    for (const c of cases) if (c.test(e)) return c.run(e);
    throw new Error('Non-exhaustive matchErrorOf');
  }

  const api = {
    with<T>(ctorOrGuard: ErrorCtor<T & Error> | Guard<T>, handler: (e: T) => R) {
      return isCtor(ctorOrGuard)
        ? withCtor(ctorOrGuard as ErrorCtor<any>, handler as any)
        : withGuard(ctorOrGuard as Guard<any>, handler as any);
    },
    withAny: withAnyCtor,
    withNot: withNotCtor,
    select: selectCtor,
    when,
    _otherwise: otherwise,
    _exhaustive: runExhaustive,
  };
  return api;
}

/** Core builder for async matchers */
export function baseAsyncMatcher<R = any>() {
  const cases: AsyncCaseRunner<R>[] = [];
  // Optimization: lookup table for tag-based matching
  const tagHandlers: Map<string, (e: any) => Promise<R>> = new Map();
  let hasTagHandlers = false;

  function withGuard<T>(guard: Guard<T>, handler: (e: T) => Promise<R>) {
    cases.push({ test: guard as any, run: handler as any });
    return api;
  }
  function withCtor<T extends Error>(ctor: ErrorCtor<T>, handler: (e: T) => Promise<R>) {
    // Optimization: if the constructor has a static tag/name, use tag-based lookup
    const tag = (ctor as any).prototype?.tag;
    if (tag && typeof tag === 'string') {
      tagHandlers.set(tag, handler as any);
      hasTagHandlers = true;
    }
    cases.push({ test: (e) => e instanceof ctor, run: handler as any });
    return api;
  }
  function withAnyCtor<T extends Error>(ctors: ErrorCtor<T>[], handler: (e: T) => Promise<R>) {
    cases.push({
      test: (e) => ctors.some(ctor => e instanceof ctor),
      run: handler as any
    });
    return api;
  }
  function withNotCtor<T extends Error>(ctors: ErrorCtor<T> | ErrorCtor<T>[], handler: (e: any) => Promise<R>) {
    const ctorArray = Array.isArray(ctors) ? ctors : [ctors];
    cases.push({
      test: (e) => !ctorArray.some(ctor => e instanceof ctor),
      run: handler as any
    });
    return api;
  }
  function selectCtor<T extends Error, K extends string>(
    ctor: ErrorCtor<T>,
    key: K,
    handler: (value: any) => Promise<R>
  ) {
    cases.push({
      test: (e) => e instanceof ctor,
      run: async (e: any) => {
        const value = (e as any).data?.[key];
        return handler(value);
      }
    });
    return api;
  }
  function when(pred: (e: any) => boolean, handler: (e: any) => Promise<R>) {
    cases.push({ test: pred, run: handler });
    return api;
  }
  async function otherwise(e: unknown, fallback: (e: unknown) => Promise<R>): Promise<R> {
    // Fast path: try tag-based lookup first
    if (hasTagHandlers && typeof e === 'object' && e !== null && 'tag' in e) {
      const handler = tagHandlers.get((e as any).tag);
      if (handler) return handler(e);
    }
    // Fallback: iterate through cases
    for (const c of cases) if (c.test(e)) return c.run(e);
    return fallback(e);
  }
  async function runExhaustive(e: unknown): Promise<R> {
    // Fast path: try tag-based lookup first
    if (hasTagHandlers && typeof e === 'object' && e !== null && 'tag' in e) {
      const handler = tagHandlers.get((e as any).tag);
      if (handler) return handler(e);
    }
    // Fallback: iterate through cases
    for (const c of cases) if (c.test(e)) return c.run(e);
    throw new Error('Non-exhaustive matchErrorOf');
  }

  const api = {
    with<T>(ctorOrGuard: ErrorCtor<T & Error> | Guard<T>, handler: (e: T) => Promise<R>) {
      return isCtor(ctorOrGuard)
        ? withCtor(ctorOrGuard as ErrorCtor<any>, handler as any)
        : withGuard(ctorOrGuard as Guard<any>, handler as any);
    },
    withAny: withAnyCtor,
    withNot: withNotCtor,
    select: selectCtor,
    when,
    _otherwise: otherwise,
    _exhaustive: runExhaustive,
  };
  return api;
}
