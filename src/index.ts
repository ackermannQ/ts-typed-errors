export * from './core/types';
export { wrap } from './core/wrap';

export { defineError } from './errors/defineError';

export { matchError, matchErrorOf, matchErrorAsync, matchErrorOfAsync } from './match/public';
export type { Matcher, AsyncMatcher, HandlerInput } from './match/public';

export { isError, hasCode, isErrorOf, isAnyOf, isAllOf } from './utils/guards';

export { serialize, deserialize, toJSON, fromJSON } from './utils/serialization';
export type { SerializedError } from './utils/serialization';
