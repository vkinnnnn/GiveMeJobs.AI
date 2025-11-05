/**
 * Result type unit tests (no database required)
 */

import { describe, it, expect } from 'vitest';
import { Result, ValidationError, ServiceError } from '../../types/result.types';

describe('Result Type', () => {
  describe('Success Results', () => {
    it('should create successful result', () => {
      const result = Result.success('test data');
      
      expect(result.success).toBe(true);
      expect(result.failure).toBe(false);
      expect(result.data).toBe('test data');
    });

    it('should map successful result', () => {
      const result = Result.success(5);
      const mapped = result.map(x => x * 2);
      
      expect(mapped.success).toBe(true);
      expect(mapped.data).toBe(10);
    });

    it('should chain successful results with flatMap', () => {
      const result = Result.success(5);
      const chained = result.flatMap(x => Result.success(x * 2));
      
      expect(chained.success).toBe(true);
      expect(chained.data).toBe(10);
    });

    it('should execute tap function on success', () => {
      let sideEffect = '';
      const result = Result.success('test');
      
      const tapped = result.tap(data => {
        sideEffect = data;
      });
      
      expect(tapped.success).toBe(true);
      expect(sideEffect).toBe('test');
    });

    it('should return data with getOrElse', () => {
      const result = Result.success('success');
      const value = result.getOrElse('default');
      
      expect(value).toBe('success');
    });
  });

  describe('Error Results', () => {
    it('should create error result', () => {
      const error = new Error('test error');
      const result = Result.error(error);
      
      expect(result.success).toBe(false);
      expect(result.failure).toBe(true);
      expect(result.error).toBe(error);
    });

    it('should not map error result', () => {
      const result = Result.error(new Error('test'));
      const mapped = result.map(x => x * 2);
      
      expect(mapped.failure).toBe(true);
      expect(mapped.error.message).toBe('test');
    });

    it('should map error with mapError', () => {
      const result = Result.error(new Error('original'));
      const mapped = result.mapError(err => new Error('mapped: ' + err.message));
      
      expect(mapped.failure).toBe(true);
      expect(mapped.error.message).toBe('mapped: original');
    });

    it('should not execute tap function on error', () => {
      let sideEffect = '';
      const result = Result.error(new Error('test'));
      
      const tapped = result.tap(data => {
        sideEffect = 'should not execute';
      });
      
      expect(tapped.failure).toBe(true);
      expect(sideEffect).toBe('');
    });

    it('should execute tapError function on error', () => {
      let sideEffect = '';
      const result = Result.error(new Error('test error'));
      
      const tapped = result.tapError(error => {
        sideEffect = error.message;
      });
      
      expect(tapped.failure).toBe(true);
      expect(sideEffect).toBe('test error');
    });

    it('should return default with getOrElse', () => {
      const result = Result.error(new Error('test'));
      const value = result.getOrElse('default');
      
      expect(value).toBe('default');
    });
  });

  describe('Static Methods', () => {
    it('should create result from function that succeeds', () => {
      const result = Result.from(() => 'success');
      
      expect(result.success).toBe(true);
      expect(result.data).toBe('success');
    });

    it('should create result from function that throws', () => {
      const result = Result.from(() => {
        throw new Error('test error');
      });
      
      expect(result.failure).toBe(true);
      expect(result.error.message).toBe('test error');
    });

    it('should combine successful results', () => {
      const result1 = Result.success(1);
      const result2 = Result.success(2);
      const result3 = Result.success(3);
      
      const combined = Result.combine(result1, result2, result3);
      
      expect(combined.success).toBe(true);
      expect(combined.data).toEqual([1, 2, 3]);
    });

    it('should fail to combine if any result is error', () => {
      const result1 = Result.success(1);
      const result2 = Result.error(new Error('test'));
      const result3 = Result.success(3);
      
      const combined = Result.combine(result1, result2, result3);
      
      expect(combined.failure).toBe(true);
      expect(combined.error.message).toBe('test');
    });

    it('should collect successful results', () => {
      const results = [
        Result.success(1),
        Result.error(new Error('test')),
        Result.success(3),
        Result.success(4)
      ];
      
      const successes = Result.collectSuccesses(results);
      
      expect(successes).toEqual([1, 3, 4]);
    });

    it('should collect error results', () => {
      const error1 = new Error('error1');
      const error2 = new Error('error2');
      const results = [
        Result.success(1),
        Result.error(error1),
        Result.success(3),
        Result.error(error2)
      ];
      
      const errors = Result.collectErrors(results);
      
      expect(errors).toEqual([error1, error2]);
    });
  });

  describe('Pattern Matching', () => {
    it('should match success case', () => {
      const result = Result.success('test');
      
      const matched = result.match(
        data => `Success: ${data}`,
        error => `Error: ${error.message}`
      );
      
      expect(matched).toBe('Success: test');
    });

    it('should match error case', () => {
      const result = Result.error(new Error('test error'));
      
      const matched = result.match(
        data => `Success: ${data}`,
        error => `Error: ${error.message}`
      );
      
      expect(matched).toBe('Error: test error');
    });
  });

  describe('Utility Methods', () => {
    it('should check if result contains specific value', () => {
      const result = Result.success('test');
      
      expect(result.contains('test')).toBe(true);
      expect(result.contains('other')).toBe(false);
    });

    it('should check if result exists with predicate', () => {
      const result = Result.success(10);
      
      expect(result.exists(x => x > 5)).toBe(true);
      expect(result.exists(x => x < 5)).toBe(false);
    });

    it('should filter successful result', () => {
      const result = Result.success(10);
      const error = new Error('filtered out');
      
      const filtered = result.filter(x => x > 5, error);
      expect(filtered.success).toBe(true);
      
      const filteredOut = result.filter(x => x < 5, error);
      expect(filteredOut.failure).toBe(true);
      expect(filteredOut.error).toBe(error);
    });

    it('should convert to JSON', () => {
      const successResult = Result.success('test');
      const errorResult = Result.error(new Error('test error'));
      
      expect(successResult.toJSON()).toEqual({
        success: true,
        data: 'test'
      });
      
      const errorJson = errorResult.toJSON();
      expect(errorJson.success).toBe(false);
      expect(errorJson.error).toBeInstanceOf(Error);
    });
  });

  describe('Error Types', () => {
    it('should create ValidationError with field and code', () => {
      const error = new ValidationError('Invalid email', 'email', 'INVALID_FORMAT');
      
      expect(error.message).toBe('Invalid email');
      expect(error.field).toBe('email');
      expect(error.code).toBe('INVALID_FORMAT');
      expect(error.name).toBe('ValidationError');
    });

    it('should create ServiceError with code and cause', () => {
      const cause = new Error('Database error');
      const error = new ServiceError('Service failed', 'SERVICE_ERROR', cause);
      
      expect(error.message).toBe('Service failed');
      expect(error.code).toBe('SERVICE_ERROR');
      expect(error.cause).toBe(cause);
      expect(error.name).toBe('ServiceError');
    });
  });
});