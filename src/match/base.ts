import type { ErrorCtor, Guard } from '../core/types';
import { isCtor } from '../core/types';

/** Internal case representation */
interface CaseRunner<R> { test: (e: unknown) => boolean; run: (e: any) => R }

/** Core builder for matchers */
export function baseMatcher<R = any>() {
  const cases: CaseRunner<R>[] = [];

  function withGuard<T>(guard: Guard<T>, handler: (e: T) => R) {
    cases.push({ test: guard as any, run: handler as any });
    return api;
  }
  function withCtor<T extends Error>(ctor: ErrorCtor<T>, handler: (e: T) => R) {
    cases.push({ test: (e) => e instanceof ctor, run: handler as any });
    return api;
  }
  function when(pred: (e: any) => boolean, handler: (e: any) => R) {
    cases.push({ test: pred, run: handler });
    return api;
  }
  function otherwise(e: unknown, fallback: (e: unknown) => R): R {
    for (const c of cases) if (c.test(e)) return c.run(e);
    return fallback(e);
  }
  function runExhaustive(e: unknown): R {
    for (const c of cases) if (c.test(e)) return c.run(e);
    throw new Error('Non-exhaustive matchErrorOf');
  }

  const api = {
    with<T>(ctorOrGuard: ErrorCtor<T & Error> | Guard<T>, handler: (e: T) => R) {
      return isCtor(ctorOrGuard)
        ? withCtor(ctorOrGuard as ErrorCtor<any>, handler as any)
        : withGuard(ctorOrGuard as Guard<any>, handler as any);
    },
    when,
    _otherwise: otherwise,
    _exhaustive: runExhaustive,
  };
  return api;
}
