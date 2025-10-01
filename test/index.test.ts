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

describe('wrap', () => {
  it('captures errors', async () => {
    const f = wrap(async () => { throw new Net('x', { status: 500, url: '/x' }); });
    const r = await f();
    expect(r.ok).toBe(false);
  });
});
