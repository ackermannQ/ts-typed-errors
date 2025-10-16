import type { ErrorCtor } from '../core/types';

/**
 * Serialized representation of an error.
 *
 * This format is JSON-safe and suitable for transmission over the network,
 * logging, or storage.
 */
export interface SerializedError {
  /** The error tag/name for identification */
  tag: string;
  /** The error message */
  message: string;
  /** The error name */
  name: string;
  /** Optional structured data associated with the error */
  data?: Record<string, any>;
  /** Optional stack trace (may be omitted in production) */
  stack?: string;
}

/**
 * Serializes an error to a JSON-safe object.
 *
 * This function converts an error instance into a plain object that can be
 * safely stringified to JSON, transmitted over the network, or stored.
 *
 * @param error - The error to serialize
 * @param includeStack - Whether to include the stack trace (default: true in dev)
 * @returns A plain object representation of the error
 *
 * @example
 * ```typescript
 * const NetworkError = defineError('NetworkError')<{ status: number; url: string }>();
 * const error = new NetworkError('Request failed', { status: 500, url: '/api' });
 *
 * const serialized = serialize(error);
 * // {
 * //   tag: 'NetworkError',
 * //   message: 'Request failed',
 * //   name: 'NetworkError',
 * //   data: { status: 500, url: '/api' },
 * //   stack: '...'
 * // }
 *
 * // Send over network
 * await fetch('/api/log', {
 *   method: 'POST',
 *   body: JSON.stringify(serialized)
 * });
 * ```
 */
export function serialize(
  error: Error | unknown,
  includeStack: boolean = true
): SerializedError {
  if (!(error instanceof Error)) {
    return {
      tag: 'UnknownError',
      message: String(error),
      name: 'UnknownError',
      data: undefined,
      stack: undefined,
    };
  }

  const serialized: SerializedError = {
    tag: (error as any).tag ?? error.name,
    message: error.message,
    name: error.name,
  };

  // Include data if present (from defineError)
  if ('data' in error && error.data) {
    serialized.data = error.data as Record<string, any>;
  }

  // Include stack trace if requested
  if (includeStack && error.stack) {
    serialized.stack = error.stack;
  }

  return serialized;
}

/**
 * Deserializes a plain object back into an error instance.
 *
 * This function attempts to reconstruct an error instance from a serialized
 * error object. If a matching constructor is found, it creates an instance
 * of that error type; otherwise, it creates a generic Error.
 *
 * @param serialized - The serialized error object
 * @param constructors - Array of error constructors to try matching against
 * @returns An error instance
 *
 * @example
 * ```typescript
 * const NetworkError = defineError('NetworkError')<{ status: number; url: string }>();
 * const ParseError = defineError('ParseError')<{ at: string }>();
 *
 * // Receive from API
 * const response = await fetch('/api/errors/123');
 * const serialized = await response.json();
 *
 * // Deserialize with known constructors
 * const error = deserialize(serialized, [NetworkError, ParseError]);
 *
 * if (error instanceof NetworkError) {
 *   console.log(`Network error: ${error.data.status}`); // Type-safe!
 * }
 * ```
 */
export function deserialize<T extends Error>(
  serialized: SerializedError,
  constructors: ErrorCtor<T>[] = []
): Error {
  // Try to find a matching constructor
  for (const ctor of constructors) {
    // Check if the constructor has a static 'is' method (from defineError)
    if (typeof (ctor as any).is === 'function') {
      // Create a temporary object to test
      const testObj = { tag: serialized.tag };
      if ((ctor as any).is(testObj)) {
        // Found a match, reconstruct the error
        const error = new ctor(serialized.message, serialized.data as any);
        // Restore original stack if provided
        if (serialized.stack) {
          error.stack = serialized.stack;
        }
        return error;
      }
    }

    // Fallback: check by name
    if (ctor.name === serialized.tag || ctor.name === serialized.name) {
      const error = new ctor(serialized.message, serialized.data as any);
      // Restore original stack if provided
      if (serialized.stack) {
        error.stack = serialized.stack;
      }
      return error;
    }
  }

  // No match found, create a generic Error
  const error = new Error(serialized.message);
  error.name = serialized.name;

  // Restore data if present
  if (serialized.data) {
    (error as any).data = serialized.data;
  }

  // Restore tag if present
  if (serialized.tag) {
    (error as any).tag = serialized.tag;
  }

  // Restore stack if present
  if (serialized.stack) {
    error.stack = serialized.stack;
  }

  return error;
}

/**
 * Converts an error to a JSON string.
 *
 * This is a convenience function that combines serialize() with JSON.stringify().
 *
 * @param error - The error to convert
 * @param includeStack - Whether to include the stack trace
 * @returns A JSON string representation of the error
 *
 * @example
 * ```typescript
 * const error = new NetworkError('Failed', { status: 500, url: '/api' });
 * const json = toJSON(error);
 * // '{"tag":"NetworkError","message":"Failed","name":"NetworkError","data":{"status":500,"url":"/api"},"stack":"..."}'
 * ```
 */
export function toJSON(error: Error | unknown, includeStack: boolean = true): string {
  return JSON.stringify(serialize(error, includeStack));
}

/**
 * Parses a JSON string into an error instance.
 *
 * This is a convenience function that combines JSON.parse() with deserialize().
 *
 * @param json - The JSON string to parse
 * @param constructors - Array of error constructors to try matching against
 * @returns An error instance
 *
 * @example
 * ```typescript
 * const json = '{"tag":"NetworkError","message":"Failed","data":{"status":500}}';
 * const error = fromJSON(json, [NetworkError, ParseError]);
 * ```
 */
export function fromJSON<T extends Error>(
  json: string,
  constructors: ErrorCtor<T>[] = []
): Error {
  const serialized = JSON.parse(json) as SerializedError;
  return deserialize(serialized, constructors);
}
