/** Various guards and predicates useful when matching errors. */

/** Narrow unknown to Error-ish */
export const isError = (e: unknown): e is Error =>
  e instanceof Error || (typeof e === 'object' && e !== null && 'name' in (e as any) && 'message' in (e as any));

/** Guard for Node-style error.code */
export const hasCode = <C extends string | number>(code: C) =>
  (e: unknown): e is Error & { code: C } =>
    typeof e === 'object' && e !== null && (e as any).code === code;
