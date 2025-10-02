import type { ErrorCtor, Guard } from '../core/types';
import { baseMatcher } from './base';

/** Free-form matcher; must end with otherwise() */
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

/** Infer the input type of a handler constraint */
export type HandlerInput<T> =
  T extends ErrorCtor<infer I> ? I :
  T extends (e: unknown) => e is infer G ? G :
  never;

/** Chain interface with compile-time exhaustiveness via .exhaustive() */
export interface Matcher<Left> {
  with<T>(ctorOrGuard: ErrorCtor<any> | Guard<any>, handler: (e: HandlerInput<T>) => any): any;
  when(pred: (e: any) => boolean, handler: (e: any) => any): any;
  exhaustive(this: Matcher<never>): any;
  otherwise<R>(handler: (e: unknown) => R): R;
}

/** Helper computing remaining (unhandled) cases */
export type Next<Left, T> = Exclude<Left, HandlerInput<T>>;

/** Exhaustive matcher */
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
