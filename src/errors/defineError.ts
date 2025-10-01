import type { ErrorCtor } from '../core/types';

export function defineError<Name extends string>(name: Name) {
  return <Data extends object = {}>() => {
    class TE extends Error {
      readonly tag = name;
      readonly data: Readonly<Data>;
      constructor(message?: string, data?: Data) {
        super(message ?? name);
        this.name = name;
        this.data = data ? Object.freeze(data) : ({} as Readonly<Data>);
        Object.setPrototypeOf(this, new.target.prototype);
      }
      static is(e: unknown): e is InstanceType<typeof TE> {
        return e instanceof TE || (typeof e === 'object' && e !== null && (e as any).tag === name);
      }
    }
    return TE;
  };
}
