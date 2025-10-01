import type { Result } from './types';

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
