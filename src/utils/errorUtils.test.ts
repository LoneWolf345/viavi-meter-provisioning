import { describe, expect, it } from 'vitest';
import { classifyError, createErrorFromResponse, isClassifiedError, ErrorContext } from './errorUtils';

describe('errorUtils', () => {
  describe('classifyError', () => {
    it('classifies CORS errors correctly', () => {
      const error = new Error('Failed to fetch: blocked by CORS policy');
      const result = classifyError(error);

      expect(result.category).toBe('cors');
      expect(result.title).toBe('Connection Blocked');
      expect(result.isRetryable).toBe(false);
    });

    it('classifies network errors correctly', () => {
      const error = new Error('Failed to fetch');
      const result = classifyError(error);

      expect(result.category).toBe('network');
      expect(result.title).toBe('Network Error');
      expect(result.isRetryable).toBe(true);
    });

    it('classifies timeout errors correctly', () => {
      const error = new Error('Request timed out');
      const result = classifyError(error);

      expect(result.category).toBe('timeout');
      expect(result.title).toBe('Request Timeout');
      expect(result.isRetryable).toBe(true);
    });

    it('classifies server errors (5xx) correctly', () => {
      const error = new Error('Server error: 500');
      const result = classifyError(error);

      expect(result.category).toBe('server');
      expect(result.title).toBe('Server Error');
      expect(result.isRetryable).toBe(true);
    });

    it('classifies validation errors (400) correctly', () => {
      const error = new Error('Validation failed: invalid MAC format');
      const result = classifyError(error);

      expect(result.category).toBe('validation');
      expect(result.title).toBe('Validation Error');
      expect(result.isRetryable).toBe(false);
    });

    it('classifies auth errors correctly', () => {
      const error = new Error('401 Unauthorized');
      const result = classifyError(error);

      expect(result.category).toBe('auth');
      expect(result.title).toBe('Access Denied');
      expect(result.isRetryable).toBe(false);
    });

    it('classifies config errors correctly', () => {
      const error = new Error('Failed to load provision-defaults.json');
      const result = classifyError(error);

      expect(result.category).toBe('config');
      expect(result.title).toBe('Configuration Error');
      expect(result.isRetryable).toBe(true);
    });

    it('classifies OUI errors with context', () => {
      const error = new Error('OUI not in approved list');
      const context: ErrorContext = { type: 'oui' };
      const result = classifyError(error, context);

      expect(result.category).toBe('oui');
      expect(result.title).toBe('OUI Not Recognized');
      expect(result.isRetryable).toBe(false);
    });

    it('uses status code from context for classification', () => {
      const error = new Error('Some error');
      const context: ErrorContext = { statusCode: 500 };
      const result = classifyError(error, context);

      expect(result.category).toBe('server');
      expect(result.isRetryable).toBe(true);
    });

    it('handles string errors', () => {
      const result = classifyError('Network error occurred');
      expect(result.category).toBe('network');
    });

    it('returns unknown for unrecognized errors', () => {
      const error = new Error('Something completely random happened');
      const result = classifyError(error);

      expect(result.category).toBe('unknown');
      expect(result.title).toBe('Unexpected Error');
      expect(result.isRetryable).toBe(true);
    });

    it('includes all required fields in classified error', () => {
      const error = new Error('Test error');
      const result = classifyError(error);

      expect(result).toHaveProperty('category');
      expect(result).toHaveProperty('title');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('likelyCause');
      expect(result).toHaveProperty('suggestion');
      expect(result).toHaveProperty('isRetryable');
    });
  });

  describe('createErrorFromResponse', () => {
    it('creates error from 500 response', async () => {
      const response = new Response(JSON.stringify({ detail: 'Internal error' }), {
        status: 500,
        statusText: 'Internal Server Error',
      });

      const result = await createErrorFromResponse(response);

      expect(result.category).toBe('server');
      expect(result.technicalDetail).toContain('Internal error');
    });

    it('creates error from 400 response with detail', async () => {
      const response = new Response(JSON.stringify({ detail: 'MAC already exists' }), {
        status: 400,
        statusText: 'Bad Request',
      });

      const result = await createErrorFromResponse(response);

      expect(result.category).toBe('validation');
    });

    it('handles non-JSON response body', async () => {
      const response = new Response('Plain text error', {
        status: 500,
        statusText: 'Internal Server Error',
      });

      const result = await createErrorFromResponse(response);

      expect(result.category).toBe('server');
      expect(result.technicalDetail).toContain('500');
    });

    it('passes context through to classification', async () => {
      const response = new Response('', {
        status: 500,
        statusText: 'Internal Server Error',
      });

      const result = await createErrorFromResponse(response, { type: 'provision' });

      expect(result.category).toBe('server');
    });
  });

  describe('isClassifiedError', () => {
    it('returns true for valid classified error', () => {
      const error = classifyError(new Error('test'));
      expect(isClassifiedError(error)).toBe(true);
    });

    it('returns false for plain Error', () => {
      expect(isClassifiedError(new Error('test'))).toBe(false);
    });

    it('returns false for null', () => {
      expect(isClassifiedError(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isClassifiedError(undefined)).toBe(false);
    });

    it('returns false for partial object', () => {
      expect(isClassifiedError({ category: 'network' })).toBe(false);
    });
  });
});
