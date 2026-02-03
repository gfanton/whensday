import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  checkRateLimit,
  clearRateLimitStore,
  CLEANUP_INTERVAL_MS,
  type RateLimitResult,
} from "./rate-limit";

describe("rate-limit", () => {
  beforeEach(() => {
    clearRateLimitStore();
    vi.useRealTimers();
  });

  describe("checkRateLimit", () => {
    it("allows requests under the limit", () => {
      const result = checkRateLimit("192.168.1.1", 5, 60000);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
    });

    it("tracks count correctly across multiple requests", () => {
      const ip = "192.168.1.2";
      const maxRequests = 3;
      const windowMs = 60000;

      const results: RateLimitResult[] = [];
      for (let i = 0; i < 5; i++) {
        results.push(checkRateLimit(ip, maxRequests, windowMs));
      }

      expect(results[0]?.allowed).toBe(true);
      expect(results[0]?.remaining).toBe(2);

      expect(results[1]?.allowed).toBe(true);
      expect(results[1]?.remaining).toBe(1);

      expect(results[2]?.allowed).toBe(true);
      expect(results[2]?.remaining).toBe(0);

      expect(results[3]?.allowed).toBe(false);
      expect(results[3]?.remaining).toBe(0);

      expect(results[4]?.allowed).toBe(false);
      expect(results[4]?.remaining).toBe(0);
    });

    it("blocks requests when limit is exceeded", () => {
      const ip = "192.168.1.3";

      // Use up all requests
      checkRateLimit(ip, 2, 60000);
      checkRateLimit(ip, 2, 60000);

      // Third request should be blocked
      const result = checkRateLimit(ip, 2, 60000);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.resetInSeconds).toBeGreaterThan(0);
    });

    it("tracks multiple IPs independently", () => {
      const ip1 = "192.168.1.10";
      const ip2 = "192.168.1.20";

      // Use up all requests for ip1
      checkRateLimit(ip1, 1, 60000);
      const ip1Result = checkRateLimit(ip1, 1, 60000);

      // ip2 should still be allowed
      const ip2Result = checkRateLimit(ip2, 1, 60000);

      expect(ip1Result.allowed).toBe(false);
      expect(ip2Result.allowed).toBe(true);
    });

    it("resets count after window expires", () => {
      vi.useFakeTimers();

      const ip = "192.168.1.4";
      const windowMs = 60000;

      // Use up all requests
      checkRateLimit(ip, 1, windowMs);
      const blockedResult = checkRateLimit(ip, 1, windowMs);
      expect(blockedResult.allowed).toBe(false);

      // Advance time past the window
      vi.advanceTimersByTime(windowMs + 1);

      // Should be allowed again
      const newResult = checkRateLimit(ip, 1, windowMs);
      expect(newResult.allowed).toBe(true);
      expect(newResult.remaining).toBe(0);
    });

    it("returns correct resetInSeconds value", () => {
      vi.useFakeTimers();

      const ip = "192.168.1.5";
      const windowMs = 120000; // 2 minutes

      checkRateLimit(ip, 1, windowMs);

      // Advance 30 seconds
      vi.advanceTimersByTime(30000);

      const result = checkRateLimit(ip, 1, windowMs);

      expect(result.allowed).toBe(false);
      // Should be ~90 seconds remaining (120 - 30)
      expect(result.resetInSeconds).toBe(90);
    });
  });

  describe("edge cases", () => {
    it("handles maxRequests of 1 correctly", () => {
      const result = checkRateLimit("192.168.1.100", 1, 60000);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(0);

      const blocked = checkRateLimit("192.168.1.100", 1, 60000);
      expect(blocked.allowed).toBe(false);
    });

    it("allows first request even when maxRequests is 0", () => {
      // First request always sets count=1, so it's "allowed" but remaining is negative
      const result = checkRateLimit("192.168.1.101", 0, 60000);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(-1);

      // Second request is blocked
      const blocked = checkRateLimit("192.168.1.101", 0, 60000);
      expect(blocked.allowed).toBe(false);
    });
  });

  describe("cleanup interval", () => {
    it("removes expired entries when cleanup runs", () => {
      vi.useFakeTimers();

      const ip = "192.168.1.50";
      const windowMs = 60000; // 1 minute

      // Make a request to create an entry
      checkRateLimit(ip, 5, windowMs);

      // Advance past window expiry
      vi.advanceTimersByTime(windowMs + 1);

      // Advance to trigger cleanup interval
      vi.advanceTimersByTime(CLEANUP_INTERVAL_MS);

      // Entry should be cleaned up, new request starts fresh
      const result = checkRateLimit(ip, 5, windowMs);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4); // Fresh start, not 3
    });
  });

  describe("clearRateLimitStore", () => {
    it("clears all tracked IPs", () => {
      const ip = "192.168.1.6";

      // Use up all requests
      checkRateLimit(ip, 1, 60000);
      const blockedResult = checkRateLimit(ip, 1, 60000);
      expect(blockedResult.allowed).toBe(false);

      // Clear the store
      clearRateLimitStore();

      // Should be allowed again
      const newResult = checkRateLimit(ip, 1, 60000);
      expect(newResult.allowed).toBe(true);
    });
  });
});
