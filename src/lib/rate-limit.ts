// ---- Constants

export const CLEANUP_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

// ---- Types

type RateLimitEntry = {
  count: number;
  resetTime: number;
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetInSeconds: number;
};

// ---- State

const requests = new Map<string, RateLimitEntry>();
let cleanupIntervalId: ReturnType<typeof setInterval> | null = null;

// ---- Cleanup (lazy init, avoids side effects at module load)

function startCleanupInterval(): void {
  if (cleanupIntervalId !== null) return;

  cleanupIntervalId = setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of requests.entries()) {
      if (now > entry.resetTime) {
        requests.delete(ip);
      }
    }
  }, CLEANUP_INTERVAL_MS);
}

// For testing
export function clearRateLimitStore(): void {
  requests.clear();
  if (cleanupIntervalId !== null) {
    clearInterval(cleanupIntervalId);
    cleanupIntervalId = null;
  }
}

// ---- Main Function

export function checkRateLimit(
  ip: string,
  maxRequests: number,
  windowMs: number
): RateLimitResult {
  startCleanupInterval();

  const now = Date.now();
  const entry = requests.get(ip);

  if (entry === undefined || now > entry.resetTime) {
    requests.set(ip, { count: 1, resetTime: now + windowMs });
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetInSeconds: Math.ceil(windowMs / 1000),
    };
  }

  if (entry.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetInSeconds: Math.ceil((entry.resetTime - now) / 1000),
    };
  }

  entry.count++;
  return {
    allowed: true,
    remaining: maxRequests - entry.count,
    resetInSeconds: Math.ceil((entry.resetTime - now) / 1000),
  };
}
