/**
 * Wraps a promise with a timeout. If the promise doesn't resolve within
 * `ms` milliseconds, it rejects with a timeout error.
 *
 * Usage:
 *   const data = await withTimeout(supabase.from('users').select('*'), 10000);
 */
export function withTimeout<T>(promise: Promise<T>, ms = 10000): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Request timed out. Please check your connection and try again.')), ms)
  );
  return Promise.race([promise, timeout]);
}
