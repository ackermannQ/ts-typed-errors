# Getting Started

Install:
```bash
npm i ts-typed-errors
```

Basic usage:
```ts
import { defineError, matchErrorOf, wrap } from 'ts-typed-errors';

const NetworkError = defineError('NetworkError')<{ status: number; url: string }>();
const ParseError   = defineError('ParseError')<{ at: string }>();

type Err =
  | InstanceType<typeof NetworkError>
  | InstanceType<typeof ParseError>;

const getJson = async (url: string) => {
  const r = await fetch(url);
  if (!r.ok) throw new NetworkError(`HTTP ${r.status}`, { status: r.status, url });
  try { return await r.json(); }
  catch { throw new ParseError('Invalid JSON', { at: url }); }
};

const getJsonSafe = wrap(getJson);

const res = await getJsonSafe('https://httpstat.us/404');
if (!res.ok) {
  const action = matchErrorOf<Err>(res.error)
    .with(NetworkError, e => ({ kind: 'retry', to: e.data.url }))
    .with(ParseError,   e => ({ kind: 'report', at: e.data.at }))
    .exhaustive();
  console.log(action);
}
```
