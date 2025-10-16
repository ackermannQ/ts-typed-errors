import { describe, it, expect } from 'vitest';
import { defineError, matchError, matchErrorOf, hasCode, wrap, isErrorOf, isAnyOf, isAllOf, matchErrorAsync, matchErrorOfAsync, serialize, deserialize, toJSON, fromJSON } from '../src';

const Net = defineError('NetworkError')<{ status: number; url: string }>();
const Auth = defineError('AuthError')<{ reason: 'expired' | 'forbidden' }>();
const Parse = defineError('ParseError')<{ at: string }>();

type Err = InstanceType<typeof Net> | InstanceType<typeof Auth> | InstanceType<typeof Parse>;

describe('matchError', () => {
  it('matches by class', () => {
    const e = new Net('oops', { status: 500, url: '/x' });
    const out = matchError(e)
      .with(Net, err => `retry ${err.data.url}`)
      .otherwise(() => 'fallback');
    expect(out).toBe('retry /x');
  });

  it('matches by code predicate', () => {
    const e = Object.assign(new Error('broken'), { code: 'EPIPE' as const });
    const out = matchError(e)
      .when(hasCode('EPIPE'), () => 'backoff')
      .otherwise(() => 'nope');
    expect(out).toBe('backoff');
  });

  it('exhaustive compile check', () => {
    const e = new Auth('nope', { reason: 'forbidden' });
    const out = matchErrorOf<Err>(e)
      .with(Net,  () => 'net')
      .with(Auth, () => 'auth')
      .with(Parse,() => 'parse')
      .exhaustive();
    expect(out).toBe('auth');
  });
});

describe('select', () => {
  it('extracts property from error data in matchError', () => {
    const e = new Net('oops', { status: 404, url: '/api/users' });
    const out = matchError(e)
      .select(Net, 'status', (status) => `Status code: ${status}`)
      .otherwise(() => 'fallback');
    expect(out).toBe('Status code: 404');
  });

  it('extracts property from error data in matchErrorOf', () => {
    const e = new Parse('bad', { at: 'line 42' });
    const out = matchErrorOf<Err>(e)
      .select(Net, 'url', (url) => `URL: ${url}`)
      .select(Parse, 'at', (at) => `Parse error at ${at}`)
      .with(Auth, () => 'auth')
      .exhaustive();
    expect(out).toBe('Parse error at line 42');
  });

  it('works with exhaustive matching', () => {
    const e = new Auth('forbidden', { reason: 'forbidden' });
    const out = matchErrorOf<Err>(e)
      .select(Net, 'status', (status) => `Status: ${status}`)
      .select(Parse, 'at', (at) => `At: ${at}`)
      .select(Auth, 'reason', (reason) => `Auth reason: ${reason}`)
      .exhaustive();
    expect(out).toBe('Auth reason: forbidden');
  });

  it('can be mixed with with()', () => {
    const e = new Net('error', { status: 500, url: '/api' });
    const out = matchError(e)
      .select(Net, 'status', (status) => status > 400 ? 'error' : 'ok')
      .with(Auth, (err) => `auth: ${err.data.reason}`)
      .otherwise(() => 'fallback');
    expect(out).toBe('error');
  });
});

describe('isErrorOf', () => {
  it('creates simple type guard', () => {
    const isNetworkError = isErrorOf(Net);
    const error = new Net('error', { status: 500, url: '/api' });
    const otherError = new Auth('forbidden', { reason: 'forbidden' });

    expect(isNetworkError(error)).toBe(true);
    expect(isNetworkError(otherError)).toBe(false);
    expect(isNetworkError('not an error')).toBe(false);
    expect(isNetworkError(null)).toBe(false);
  });

  it('creates type guard with predicate', () => {
    const isServerError = isErrorOf(Net, (e) => e.data.status >= 500);
    const isClientError = isErrorOf(Net, (e) => e.data.status >= 400 && e.data.status < 500);

    const serverErr = new Net('server error', { status: 500, url: '/api' });
    const clientErr = new Net('client error', { status: 404, url: '/api' });
    const successErr = new Net('not an error', { status: 200, url: '/api' });

    expect(isServerError(serverErr)).toBe(true);
    expect(isServerError(clientErr)).toBe(false);
    expect(isServerError(successErr)).toBe(false);

    expect(isClientError(clientErr)).toBe(true);
    expect(isClientError(serverErr)).toBe(false);
    expect(isClientError(successErr)).toBe(false);
  });

  it('works with matchError', () => {
    const isServerError = isErrorOf(Net, (e) => e.data.status >= 500);
    const isClientError = isErrorOf(Net, (e) => e.data.status >= 400 && e.data.status < 500);

    const error = new Net('error', { status: 404, url: '/api' });
    const result = matchError(error)
      .with(isServerError, (e) => `Server error: ${e.data.status}`)
      .with(isClientError, (e) => `Client error: ${e.data.status}`)
      .otherwise(() => 'Other');

    expect(result).toBe('Client error: 404');
  });

  it('type guard narrows type correctly', () => {
    const isNetworkError = isErrorOf(Net);
    const error: unknown = new Net('error', { status: 500, url: '/api' });

    if (isNetworkError(error)) {
      // TypeScript should know error is NetworkError here
      const status: number = error.data.status;
      const url: string = error.data.url;
      expect(status).toBe(500);
      expect(url).toBe('/api');
    } else {
      throw new Error('Should have matched');
    }
  });
});

describe('withAny', () => {
  it('matches multiple error types with same handler', () => {
    const error = new Net('error', { status: 500, url: '/api' });
    const result = matchError(error)
      .withAny([Net, Auth], (e) => 'Connection or auth issue')
      .with(Parse, (e) => `Parse error at ${e.data.at}`)
      .otherwise(() => 'Other');

    expect(result).toBe('Connection or auth issue');
  });

  it('works with matchErrorOf exhaustive', () => {
    const error = new Auth('forbidden', { reason: 'forbidden' });
    const result = matchErrorOf<Err>(error)
      .withAny([Net, Auth], (e) => 'Network or auth')
      .with(Parse, (e) => 'Parse')
      .exhaustive();

    expect(result).toBe('Network or auth');
  });

  it('matches first matching type in array', () => {
    const error = new Parse('bad', { at: 'line 5' });
    const result = matchError(error)
      .withAny([Net, Auth], () => 'First group')
      .withAny([Parse], () => 'Second group')
      .otherwise(() => 'Other');

    expect(result).toBe('Second group');
  });
});

describe('withNot', () => {
  it('matches all except specified type', () => {
    const error = new Parse('error', { at: 'line 1' });
    const result = matchError(error)
      .withNot(Net, (e) => 'Not a network error')
      .otherwise(() => 'Network error');

    expect(result).toBe('Not a network error');
  });

  it('excludes single type', () => {
    const netError = new Net('error', { status: 500, url: '/api' });
    const result = matchError(netError)
      .withNot(Net, () => 'Not network')
      .otherwise(() => 'Is network');

    expect(result).toBe('Is network');
  });

  it('excludes multiple types with array', () => {
    const error = new Parse('error', { at: 'line 1' });
    const result = matchError(error)
      .withNot([Net, Auth], (e) => 'Neither network nor auth')
      .otherwise(() => 'Network or auth');

    expect(result).toBe('Neither network nor auth');
  });

  it('handles array exclusion correctly', () => {
    const netError = new Net('error', { status: 500, url: '/api' });
    const authError = new Auth('error', { reason: 'forbidden' });

    const netResult = matchError(netError)
      .withNot([Net, Auth], () => 'Other')
      .otherwise(() => 'Network or Auth');

    const authResult = matchError(authError)
      .withNot([Net, Auth], () => 'Other')
      .otherwise(() => 'Network or Auth');

    expect(netResult).toBe('Network or Auth');
    expect(authResult).toBe('Network or Auth');
  });

  it('can be combined with with()', () => {
    const error = new Parse('error', { at: 'line 1' });
    const result = matchError(error)
      .with(Net, () => 'Network')
      .withNot([Net, Auth], () => 'Other type')
      .otherwise(() => 'Auth');

    expect(result).toBe('Other type');
  });
});

describe('isAnyOf', () => {
  it('checks if error is instance of any constructor', () => {
    const netError = new Net('error', { status: 500, url: '/api' });
    const authError = new Auth('forbidden', { reason: 'forbidden' });
    const parseError = new Parse('error', { at: 'line 1' });

    expect(isAnyOf(netError, [Net, Auth])).toBe(true);
    expect(isAnyOf(authError, [Net, Auth])).toBe(true);
    expect(isAnyOf(parseError, [Net, Auth])).toBe(false);
  });

  it('returns false for non-errors', () => {
    expect(isAnyOf('not an error', [Net, Auth])).toBe(false);
    expect(isAnyOf(null, [Net, Auth])).toBe(false);
    expect(isAnyOf(undefined, [Net, Auth])).toBe(false);
    expect(isAnyOf({}, [Net, Auth])).toBe(false);
  });

  it('works with single constructor in array', () => {
    const netError = new Net('error', { status: 500, url: '/api' });
    expect(isAnyOf(netError, [Net])).toBe(true);
    expect(isAnyOf(netError, [Auth])).toBe(false);
  });

  it('narrows type correctly', () => {
    const error: unknown = new Net('error', { status: 500, url: '/api' });

    if (isAnyOf(error, [Net, Auth])) {
      // TypeScript should know error is Net | Auth here
      if (error instanceof Net) {
        const status: number = error.data.status;
        expect(status).toBe(500);
      }
    } else {
      throw new Error('Should have matched');
    }
  });
});

describe('isAllOf', () => {
  it('checks if value passes all guards', () => {
    const isServerError = isErrorOf(Net, (e) => e.data.status >= 500);
    const hasHighStatus = isErrorOf(Net, (e) => e.data.status >= 400);

    const serverError = new Net('error', { status: 500, url: '/api' });
    const clientError = new Net('error', { status: 404, url: '/api' });

    expect(isAllOf(serverError, [isServerError, hasHighStatus])).toBe(true);
    expect(isAllOf(clientError, [isServerError, hasHighStatus])).toBe(false);
    expect(isAllOf(clientError, [hasHighStatus])).toBe(true);
  });

  it('returns true for empty guard array', () => {
    const error = new Net('error', { status: 500, url: '/api' });
    expect(isAllOf(error, [])).toBe(true);
  });

  it('works with single guard', () => {
    const isNetworkError = isErrorOf(Net);
    const netError = new Net('error', { status: 500, url: '/api' });
    const authError = new Auth('forbidden', { reason: 'forbidden' });

    expect(isAllOf(netError, [isNetworkError])).toBe(true);
    expect(isAllOf(authError, [isNetworkError])).toBe(false);
  });

  it('can combine different guard types', () => {
    const isNetworkError = isErrorOf(Net);
    const hasHighStatus = (e: unknown): e is Net =>
      e instanceof Net && e.data.status >= 500;

    const serverError = new Net('error', { status: 500, url: '/api' });
    const clientError = new Net('error', { status: 404, url: '/api' });

    expect(isAllOf(serverError, [isNetworkError, hasHighStatus])).toBe(true);
    expect(isAllOf(clientError, [isNetworkError, hasHighStatus])).toBe(false);
  });
});

describe('matchErrorAsync', () => {
  it('handles async handlers', async () => {
    const error = new Net('error', { status: 500, url: '/api' });
    let logged = false;

    const result = await matchErrorAsync(error)
      .with(Net, async (e) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        logged = true;
        return `Network error: ${e.data.status}`;
      })
      .otherwise(async () => 'Other');

    expect(result).toBe('Network error: 500');
    expect(logged).toBe(true);
  });

  it('works with withAny and async handlers', async () => {
    const error = new Auth('forbidden', { reason: 'forbidden' });

    const result = await matchErrorAsync(error)
      .withAny([Net, Auth], async (e) => {
        await new Promise(resolve => setTimeout(resolve, 5));
        return 'Connection or auth issue';
      })
      .otherwise(async () => 'Other');

    expect(result).toBe('Connection or auth issue');
  });

  it('works with select and async handlers', async () => {
    const error = new Net('error', { status: 404, url: '/api/users' });

    const result = await matchErrorAsync(error)
      .select(Net, 'status', async (status) => {
        await new Promise(resolve => setTimeout(resolve, 5));
        return `Status: ${status}`;
      })
      .otherwise(async () => 'Other');

    expect(result).toBe('Status: 404');
  });

  it('falls through to otherwise', async () => {
    const error = new Parse('error', { at: 'line 1' });

    const result = await matchErrorAsync(error)
      .with(Net, async () => 'Network')
      .with(Auth, async () => 'Auth')
      .otherwise(async (e) => {
        await new Promise(resolve => setTimeout(resolve, 5));
        return 'Fallback';
      });

    expect(result).toBe('Fallback');
  });
});

describe('matchErrorOfAsync', () => {
  it('provides exhaustive async matching', async () => {
    const error = new Parse('error', { at: 'line 42' });

    const result = await matchErrorOfAsync<Err>(error)
      .with(Net, async (e) => {
        await new Promise(resolve => setTimeout(resolve, 5));
        return 'network';
      })
      .with(Auth, async (e) => {
        await new Promise(resolve => setTimeout(resolve, 5));
        return 'auth';
      })
      .with(Parse, async (e) => {
        await new Promise(resolve => setTimeout(resolve, 5));
        return `parse at ${e.data.at}`;
      })
      .exhaustive();

    expect(result).toBe('parse at line 42');
  });

  it('works with select in async context', async () => {
    const error = new Net('error', { status: 500, url: '/api' });

    const result = await matchErrorOfAsync<Err>(error)
      .select(Net, 'status', async (status) => {
        await new Promise(resolve => setTimeout(resolve, 5));
        return `status-${status}`;
      })
      .with(Auth, async () => 'auth')
      .with(Parse, async () => 'parse')
      .exhaustive();

    expect(result).toBe('status-500');
  });

  it('works with withAny in exhaustive context', async () => {
    const error = new Auth('error', { reason: 'expired' });

    const result = await matchErrorOfAsync<Err>(error)
      .withAny([Net, Auth], async () => {
        await new Promise(resolve => setTimeout(resolve, 5));
        return 'connection-related';
      })
      .with(Parse, async () => 'parse')
      .exhaustive();

    expect(result).toBe('connection-related');
  });
});

describe('serialize', () => {
  it('serializes error with data', () => {
    const error = new Net('Request failed', { status: 500, url: '/api' });
    const serialized = serialize(error);

    expect(serialized.tag).toBe('NetworkError');
    expect(serialized.message).toBe('Request failed');
    expect(serialized.name).toBe('NetworkError');
    expect(serialized.data).toEqual({ status: 500, url: '/api' });
    expect(serialized.stack).toBeDefined();
  });

  it('serializes error without stack', () => {
    const error = new Net('Request failed', { status: 404, url: '/api' });
    const serialized = serialize(error, false);

    expect(serialized.stack).toBeUndefined();
    expect(serialized.data).toEqual({ status: 404, url: '/api' });
  });

  it('serializes standard Error', () => {
    const error = new Error('Standard error');
    const serialized = serialize(error);

    expect(serialized.tag).toBe('Error');
    expect(serialized.message).toBe('Standard error');
    expect(serialized.data).toBeUndefined();
  });

  it('serializes non-Error values', () => {
    const serialized = serialize('just a string');

    expect(serialized.tag).toBe('UnknownError');
    expect(serialized.message).toBe('just a string');
    expect(serialized.data).toBeUndefined();
  });
});

describe('deserialize', () => {
  it('deserializes to correct error type', () => {
    const serialized = {
      tag: 'NetworkError',
      message: 'Request failed',
      name: 'NetworkError',
      data: { status: 500, url: '/api' }
    };

    const error = deserialize(serialized, [Net, Auth, Parse]);

    expect(error).toBeInstanceOf(Net);
    expect(error.message).toBe('Request failed');
    if (error instanceof Net) {
      expect(error.data.status).toBe(500);
      expect(error.data.url).toBe('/api');
    }
  });

  it('deserializes with matching constructor', () => {
    const serialized = {
      tag: 'AuthError',
      message: 'Forbidden',
      name: 'AuthError',
      data: { reason: 'forbidden' as const }
    };

    const error = deserialize(serialized, [Net, Auth]);

    expect(error).toBeInstanceOf(Auth);
    if (error instanceof Auth) {
      expect(error.data.reason).toBe('forbidden');
    }
  });

  it('falls back to generic Error if no match', () => {
    const serialized = {
      tag: 'UnknownError',
      message: 'Unknown',
      name: 'UnknownError',
      data: { foo: 'bar' }
    };

    const error = deserialize(serialized, [Net, Auth]);

    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('Unknown');
    expect((error as any).tag).toBe('UnknownError');
    expect((error as any).data).toEqual({ foo: 'bar' });
  });

  it('preserves stack trace', () => {
    const originalStack = 'Error: Failed\n    at test.ts:123';
    const serialized = {
      tag: 'NetworkError',
      message: 'Failed',
      name: 'NetworkError',
      data: { status: 500, url: '/api' },
      stack: originalStack
    };

    const error = deserialize(serialized, [Net]);

    // Stack is restored from serialized data
    expect(error.stack).toBe(originalStack);
  });
});

describe('toJSON and fromJSON', () => {
  it('round-trips error through JSON', () => {
    const original = new Net('Request failed', { status: 404, url: '/api/users' });

    const json = toJSON(original, false); // Exclude stack for cleaner test
    const restored = fromJSON(json, [Net, Auth, Parse]);

    expect(restored).toBeInstanceOf(Net);
    expect(restored.message).toBe('Request failed');
    if (restored instanceof Net) {
      expect(restored.data.status).toBe(404);
      expect(restored.data.url).toBe('/api/users');
    }
  });

  it('handles JSON serialization of Auth error', () => {
    const original = new Auth('Access denied', { reason: 'expired' });

    const json = toJSON(original);
    const parsed = JSON.parse(json);

    expect(parsed.tag).toBe('AuthError');
    expect(parsed.data.reason).toBe('expired');

    const restored = fromJSON(json, [Net, Auth, Parse]);
    expect(restored).toBeInstanceOf(Auth);
  });
});

describe('map', () => {
  it('transforms error before matching', () => {
    const error = new Net('error', { status: 500, url: '/api' });

    const result = matchError(error)
      .map((e) => {
        if (e instanceof Net) {
          return new Net(e.message, { ...e.data, status: e.data.status + 1 });
        }
        return e;
      })
      .with(Net, (e) => `Status: ${e.data.status}`)
      .otherwise(() => 'Other');

    expect(result).toBe('Status: 501');
  });

  it('can chain multiple transformations', () => {
    const error = new Net('error', { status: 100, url: '/api' });

    const result = matchError(error)
      .map((e) => e instanceof Net ? new Net(e.message, { ...e.data, status: e.data.status * 2 }) : e)
      .map((e) => e instanceof Net ? new Net(e.message, { ...e.data, status: e.data.status + 50 }) : e)
      .with(Net, (e) => e.data.status)
      .otherwise(() => 0);

    expect(result).toBe(250); // (100 * 2) + 50
  });

  it('works with exhaustive matching', () => {
    const error = new Parse('error', { at: 'line 1' });

    const result = matchErrorOf<Err>(error)
      .map((e) => {
        if (e instanceof Parse) {
          return new Parse(e.message + ' (transformed)', { at: e.data.at + ':modified' });
        }
        return e;
      })
      .with(Net, () => 'network')
      .with(Auth, () => 'auth')
      .with(Parse, (e) => `${e.message} at ${e.data.at}`)
      .exhaustive();

    expect(result).toBe('error (transformed) at line 1:modified');
  });

  it('works with async matchers', async () => {
    const error = new Net('error', { status: 404, url: '/api' });

    const result = await matchErrorAsync(error)
      .map((e) => e instanceof Net ? new Net('transformed', { ...e.data, status: 500 }) : e)
      .with(Net, async (e) => {
        await new Promise(resolve => setTimeout(resolve, 5));
        return `Async status: ${e.data.status}`;
      })
      .otherwise(async () => 'Other');

    expect(result).toBe('Async status: 500');
  });

  it('transformation applies before all matchers', () => {
    const error = new Auth('error', { reason: 'expired' });
    let transformCalled = false;

    const result = matchError(error)
      .map((e) => {
        transformCalled = true;
        return e;
      })
      .with(Net, () => 'network')
      .with(Auth, () => 'auth')
      .otherwise(() => 'other');

    expect(transformCalled).toBe(true);
    expect(result).toBe('auth');
  });
});

describe('wrap', () => {
  it('captures errors', async () => {
    const f = wrap(async () => { throw new Net('x', { status: 500, url: '/x' }); });
    const r = await f();
    expect(r.ok).toBe(false);
  });
});
