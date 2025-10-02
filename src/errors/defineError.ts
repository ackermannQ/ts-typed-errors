import type { ErrorCtor } from '../core/types';

/**
 * Creates a typed error constructor with a specific name and optional data.
 * 
 * This function provides a factory for creating strongly-typed error classes
 * with a unique tag for identification and optional structured data.
 * 
 * @template Name - The unique name/tag for this error type
 * @param name - The unique identifier for this error type
 * @returns A function that creates the error class with optional data type
 * 
 * @example
 * ```typescript
 * // Define a simple error
 * const ValidationError = defineError('ValidationError')();
 * 
 * // Define an error with structured data
 * const NetworkError = defineError('NetworkError')<{
 *   statusCode: number;
 *   url: string;
 * }>();
 * 
 * // Usage
 * throw new ValidationError('Invalid input');
 * throw new NetworkError('Request failed', { statusCode: 404, url: '/api/users' });
 * 
 * // Type-safe matching
 * if (NetworkError.is(error)) {
 *   console.log(error.data.statusCode); // TypeScript knows this exists
 * }
 * ```
 */
export function defineError<Name extends string>(name: Name) {
  return <Data extends object = {}>() => {
    /**
     * A typed error class with a unique tag and optional structured data.
     * 
     * @param message - Optional error message (defaults to the error name)
     * @param data - Optional structured data associated with the error
     */
    class TE extends Error {
      /** Unique identifier for this error type */
      readonly tag = name;
      /** Structured data associated with this error */
      readonly data: Readonly<Data>;
      
      constructor(message?: string, data?: Data) {
        super(message ?? name);
        this.name = name;
        this.data = data ? Object.freeze(data) : ({} as Readonly<Data>);
        Object.setPrototypeOf(this, new.target.prototype);
      }
      
      /**
       * Type guard to check if an unknown value is an instance of this error.
       * 
       * @param e - The value to check
       * @returns True if the value is an instance of this error type
       */
      static is(e: unknown): e is InstanceType<typeof TE> {
        return e instanceof TE || (typeof e === 'object' && e !== null && (e as any).tag === name);
      }
    }
    return TE;
  };
}
