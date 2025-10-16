import { describe, it, expect } from 'vitest';
import { defineError, matchError, matchErrorOf, hasCode, wrap } from '../src';

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

describe('wrap', () => {
  it('captures errors', async () => {
    const f = wrap(async () => { throw new Net('x', { status: 500, url: '/x' }); });
    const r = await f();
    expect(r.ok).toBe(false);
  });
});
