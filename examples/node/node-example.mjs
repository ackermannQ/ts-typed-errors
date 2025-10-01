/**
 * Node example for ts-typed-errors
 * Run:
 *   npm i
 *   npm run build
 *   node examples/node/node-example.mjs
 */
import { defineError, matchError, wrap } from '../../dist/index.js';

// Define a couple domain errors
const NetworkError = defineError('NetworkError')();
const ParseError   = defineError('ParseError')();

/** Simulated HTTP call that throws typed errors */
async function getJson(url) {
  try {
    const r = await fetch(url);
    if (!r.ok) throw new NetworkError(`HTTP ${r.status}`, { status: r.status, url });
    try {
      return await r.json();
    } catch {
      throw new ParseError('Invalid JSON', { at: url });
    }
  } catch (error) {
    // If it's already our custom error, re-throw it
    if (error instanceof NetworkError || error instanceof ParseError) {
      throw error;
    }
    // Otherwise, wrap network errors
    throw new NetworkError(`Network error: ${error.message}`, { status: 0, url });
  }
}

// Wrap it to return a Result instead of throwing
const getJsonSafe = wrap(getJson);

const run = async () => {
  // Use an invalid endpoint to trigger NetworkError easily
  const res = await getJsonSafe('https://httpstat.us/404');

  if (!res.ok) {
    // Check if it's a NetworkError
    if (res.error instanceof NetworkError) {
      console.log('[handled]', { kind: 'retry', to: res.error.data.url });
      return;
    }
    // Check if it's a ParseError  
    if (res.error instanceof ParseError) {
      console.log('[handled]', { kind: 'report', at: res.error.data.at });
      return;
    }
    // Fallback for unknown errors
    console.log('[handled]', { kind: 'unknown' });
    return;
  }
  console.log('[value]', res.value);
};

run().catch(console.error);
