export type ErrorCtor<T extends Error = Error> = new (...args: any[]) => T;
export type Guard<T> = (e: unknown) => e is T;

export const isCtor = (fn: any): fn is ErrorCtor<any> =>
  typeof fn === 'function' && fn.prototype instanceof Error;

export type Result<T, E = unknown> =
  | { ok: true; value: T }
  | { ok: false; error: E };
