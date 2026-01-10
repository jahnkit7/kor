// Utility for promise timeout to prevent infinite loading states

export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  fallback: T
): Promise<T> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      console.warn(`[withTimeout] Promise timed out after ${timeoutMs}ms, using fallback`);
      resolve(fallback);
    }, timeoutMs);

    promise
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timer);
        console.warn(`[withTimeout] Promise rejected:`, error);
        resolve(fallback);
      });
  });
}
