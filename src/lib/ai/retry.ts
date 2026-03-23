export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const { maxRetries = 3, baseDelay = 2000, maxDelay = 16000 } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      const message = lastError.message || "";

      // Don't retry content safety refusals
      if (message.includes("safety") || message.includes("blocked")) {
        throw lastError;
      }

      // Don't retry on last attempt
      if (attempt === maxRetries) break;

      // Calculate delay with exponential backoff
      const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);

      // Only retry on rate limits (429) or server errors (5xx)
      const isRetryable =
        message.includes("429") ||
        message.includes("rate") ||
        message.includes("500") ||
        message.includes("503") ||
        message.includes("timeout");

      if (!isRetryable && attempt > 0) break;

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError || new Error("Retry failed");
}
