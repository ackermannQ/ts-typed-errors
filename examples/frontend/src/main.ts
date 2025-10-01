import { defineError, matchErrorOf, wrap } from '../../src';

const NetworkError = defineError('NetworkError')<{ status: number; url: string }>();
const ParseError   = defineError('ParseError')<{ at: string }>();

type Err =
  | InstanceType<typeof NetworkError>
  | InstanceType<typeof ParseError>;

const out = document.getElementById('out')! as HTMLPreElement;
const log = (x: any) => { out.textContent = JSON.stringify(x, null, 2); console.log(x); };

async function getJson(url: string) {
  const r = await fetch(url);
  if (!r.ok) throw new NetworkError(`HTTP ${r.status}`, { status: r.status, url });
  try {
    return await r.json();
  } catch {
    throw new ParseError('Invalid JSON', { at: url });
  }
}

const getJsonSafe = wrap(getJson);

document.getElementById('btn-200')!.addEventListener('click', async () => {
  const res = await getJsonSafe('https://httpbin.org/json');
  if (!res.ok) {
    const handled = matchErrorOf<Err>(res.error)
      .with(NetworkError, (e) => ({ kind: 'retry', to: e.data.url }))
      .with(ParseError,   (e) => ({ kind: 'report', at: e.data.at }))
      .exhaustive();
    log(handled);
    return;
  }
  log(res.value);
});

document.getElementById('btn-404')!.addEventListener('click', async () => {
  const res = await getJsonSafe('https://httpstat.us/404');
  if (!res.ok) {
    const handled = matchErrorOf<Err>(res.error)
      .with(NetworkError, (e) => ({ kind: 'retry', to: e.data.url }))
      .with(ParseError,   (e) => ({ kind: 'report', at: e.data.at }))
      .exhaustive();
    log(handled);
    return;
  }
  log(res.value);
});

document.getElementById('btn-badjson')!.addEventListener('click', async () => {
  // This endpoint returns plain text, not JSON, to trigger ParseError
  const res = await getJsonSafe('https://httpbin.org/html');
  if (!res.ok) {
    const handled = matchErrorOf<Err>(res.error)
      .with(NetworkError, (e) => ({ kind: 'retry', to: e.data.url }))
      .with(ParseError,   (e) => ({ kind: 'report', at: e.data.at }))
      .exhaustive();
    log(handled);
    return;
  }
  log(res.value);
});
