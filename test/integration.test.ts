import { describe, it, expect } from 'vitest';
import { defineError, matchError, matchErrorOf, wrap, isError, hasCode } from '../src';

describe('Integration tests - Full API usage', () => {
  // Define error types as shown in documentation
  const NetworkError = defineError('NetworkError')<{ status: number; url: string }>();
  const ValidationError = defineError('ValidationError')<{ field: string; value: any }>();
  const ParseError = defineError('ParseError')<{ at: string }>();

  type AppError = InstanceType<typeof NetworkError> | InstanceType<typeof ValidationError> | InstanceType<typeof ParseError>;

  it('should work with defineError and data access', () => {
    const error = new NetworkError('Connection failed', { status: 500, url: '/api/users' });
    
    expect(error.tag).toBe('NetworkError');
    expect(error.data.status).toBe(500);
    expect(error.data.url).toBe('/api/users');
    expect(error.message).toBe('Connection failed');
    expect(error.name).toBe('NetworkError');
  });

  it('should work with matchError (free matcher)', () => {
    const error = new ValidationError('Invalid input', { field: 'email', value: 'not-an-email' });
    
    const result = matchError(error)
      .with(NetworkError, e => `Network: ${e.data.status}`)
      .with(ValidationError, e => `Validation: ${e.data.field} = ${e.data.value}`)
      .with(ParseError, e => `Parse: ${e.data.at}`)
      .otherwise(e => `Unknown: ${e.message}`);
    
    expect(result).toBe('Validation: email = not-an-email');
  });

  it('should work with matchErrorOf (exhaustive matcher)', () => {
    const error = new ParseError('Invalid JSON', { at: 'line 5' });
    
    const result = matchErrorOf<AppError>(error)
      .with(NetworkError, e => `Network: ${e.data.status}`)
      .with(ValidationError, e => `Validation: ${e.data.field}`)
      .with(ParseError, e => `Parse: ${e.data.at}`)
      .exhaustive();
    
    expect(result).toBe('Parse: line 5');
  });

  it('should work with wrap function', async () => {
    const riskyFunction = async (shouldFail: boolean) => {
      if (shouldFail) {
        throw new NetworkError('Request failed', { status: 404, url: '/api/missing' });
      }
      return { success: true };
    };

    const safeFunction = wrap(riskyFunction);

    // Test success case
    const successResult = await safeFunction(false);
    expect(successResult.ok).toBe(true);
    if (successResult.ok) {
      expect(successResult.value).toEqual({ success: true });
    }

    // Test error case
    const errorResult = await safeFunction(true);
    expect(errorResult.ok).toBe(false);
    if (!errorResult.ok) {
      expect(errorResult.error).toBeInstanceOf(NetworkError);
    }
  });

  it('should work with utility guards', () => {
    const regularError = new Error('Something went wrong');
    const nodeError = Object.assign(new Error('Connection failed'), { code: 'ECONNREFUSED' });
    const customError = new NetworkError('Network issue', { status: 500, url: '/api' });

    expect(isError(regularError)).toBe(true);
    expect(isError(nodeError)).toBe(true);
    expect(isError(customError)).toBe(true);
    expect(isError('not an error')).toBe(false);
    expect(isError(null)).toBe(false);

    expect(hasCode('ECONNREFUSED')(nodeError)).toBe(true);
    expect(hasCode('ENOTFOUND')(nodeError)).toBe(false);
  });

  it('should work with when predicates', () => {
    const error = new Error('Database connection failed');
    (error as any).code = 'ECONNREFUSED';

    const result = matchError(error)
      .when(hasCode('ECONNREFUSED'), () => 'Database is down')
      .when(hasCode('ENOTFOUND'), () => 'Host not found')
      .otherwise(() => 'Unknown database error');

    expect(result).toBe('Database is down');
  });

  it('should demonstrate complete workflow', async () => {
    // Simulate a real-world scenario
    const fetchUserData = async (userId: string) => {
      if (userId === 'invalid') {
        throw new ValidationError('Invalid user ID', { field: 'userId', value: userId });
      }
      if (userId === 'network-error') {
        throw new NetworkError('Network timeout', { status: 408, url: '/api/users/' + userId });
      }
      if (userId === 'parse-error') {
        throw new ParseError('Invalid JSON response', { at: 'user data parsing' });
      }
      return { id: userId, name: 'John Doe' };
    };

    const safeFetchUserData = wrap(fetchUserData);

    // Test validation error
    const validationResult = await safeFetchUserData('invalid');
    if (!validationResult.ok) {
      const message = matchErrorOf<AppError>(validationResult.error)
        .with(NetworkError, e => `Network error: ${e.data.status} for ${e.data.url}`)
        .with(ValidationError, e => `Invalid ${e.data.field}: ${e.data.value}`)
        .with(ParseError, e => `Parse error at: ${e.data.at}`)
        .exhaustive();
      
      expect(message).toBe('Invalid userId: invalid');
    }

    // Test network error
    const networkResult = await safeFetchUserData('network-error');
    if (!networkResult.ok) {
      const message = matchErrorOf<AppError>(networkResult.error)
        .with(NetworkError, e => `Network error: ${e.data.status} for ${e.data.url}`)
        .with(ValidationError, e => `Invalid ${e.data.field}: ${e.data.value}`)
        .with(ParseError, e => `Parse error at: ${e.data.at}`)
        .exhaustive();
      
      expect(message).toBe('Network error: 408 for /api/users/network-error');
    }

    // Test success case
    const successResult = await safeFetchUserData('123');
    expect(successResult.ok).toBe(true);
    if (successResult.ok) {
      expect(successResult.value).toEqual({ id: '123', name: 'John Doe' });
    }
  });
});
