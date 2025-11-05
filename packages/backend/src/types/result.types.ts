/**
 * Result Type for Robust Error Handling
 * Provides a consistent way to handle success and error states
 */

export class Result<T, E = Error> {
  private constructor(
    private readonly _success: boolean,
    private readonly _data?: T,
    private readonly _error?: E
  ) {}

  /**
   * Create a successful result
   */
  static success<T, E = Error>(data: T): Result<T, E> {
    return new Result<T, E>(true, data);
  }

  /**
   * Create an error result
   */
  static error<T, E = Error>(error: E): Result<T, E> {
    return new Result<T, E>(false, undefined, error);
  }

  /**
   * Check if result is successful
   */
  get success(): boolean {
    return this._success;
  }

  /**
   * Check if result is a failure
   */
  get failure(): boolean {
    return !this._success;
  }

  /**
   * Get the data (only available on success)
   */
  get data(): T {
    if (!this._success) {
      throw new Error('Cannot access data on failed result');
    }
    return this._data!;
  }

  /**
   * Get the error (only available on failure)
   */
  get error(): E {
    if (this._success) {
      throw new Error('Cannot access error on successful result');
    }
    return this._error!;
  }

  /**
   * Map the data if successful, otherwise return the error result
   */
  map<U>(fn: (data: T) => U): Result<U, E> {
    if (this._success) {
      try {
        return Result.success(fn(this._data!));
      } catch (error) {
        return Result.error(error as E);
      }
    }
    return Result.error(this._error!);
  }

  /**
   * Chain operations that return Results
   */
  flatMap<U>(fn: (data: T) => Result<U, E>): Result<U, E> {
    if (this._success) {
      return fn(this._data!);
    }
    return Result.error(this._error!);
  }

  /**
   * Handle both success and error cases
   */
  match<U>(
    onSuccess: (data: T) => U,
    onError: (error: E) => U
  ): U {
    if (this._success) {
      return onSuccess(this._data!);
    }
    return onError(this._error!);
  }

  /**
   * Get data or return default value
   */
  getOrElse(defaultValue: T): T {
    return this._success ? this._data! : defaultValue;
  }

  /**
   * Convert to Promise (useful for async operations)
   */
  toPromise(): Promise<T> {
    if (this._success) {
      return Promise.resolve(this._data!);
    }
    return Promise.reject(this._error);
  }

  /**
   * Create Result from Promise
   */
  static async fromPromise<T, E = Error>(
    promise: Promise<T>,
    errorMapper?: (error: any) => E
  ): Promise<Result<T, E>> {
    try {
      const data = await promise;
      return Result.success(data);
    } catch (error) {
      const mappedError = errorMapper ? errorMapper(error) : (error as E);
      return Result.error(mappedError);
    }
  }

  /**
   * Combine multiple Results into one
   */
  static combine<T extends readonly unknown[], E = Error>(
    results: { [K in keyof T]: Result<T[K], E> }
  ): Result<T, E> {
    const data: any[] = [];
    
    for (const result of results) {
      if (result.failure) {
        return Result.error(result.error);
      }
      data.push(result.data);
    }
    
    return Result.success(data as T);
  }

  /**
   * Convert to JSON representation
   */
  toJSON(): { success: boolean; data?: T; error?: E } {
    return {
      success: this._success,
      data: this._data,
      error: this._error,
    };
  }
}

/**
 * Utility type for async Results
 */
export type AsyncResult<T, E = Error> = Promise<Result<T, E>>;

/**
 * Helper function to wrap async operations in Result
 */
export async function asyncResult<T, E = Error>(
  operation: () => Promise<T>,
  errorMapper?: (error: any) => E
): AsyncResult<T, E> {
  return Result.fromPromise(operation(), errorMapper);
}