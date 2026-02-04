import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAccommodationVotes } from "./use-accommodation-votes";

const STORAGE_KEY_PREFIX = "whensday:accommodation-votes:";

describe("useAccommodationVotes", () => {
  const testPollId = "test-poll-123";
  const storageKey = `${STORAGE_KEY_PREFIX}${testPollId}`;

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe("initial state", () => {
    it("starts with empty votes when localStorage is empty", () => {
      const { result } = renderHook(() => useAccommodationVotes(testPollId));

      expect(result.current.isLoading).toBe(false);
      expect(result.current.votes).toEqual({});
    });

    it("loads votes from localStorage", () => {
      const accommodationId = crypto.randomUUID();
      const existingVotes = { [accommodationId]: "up" };
      localStorage.setItem(storageKey, JSON.stringify(existingVotes));

      const { result } = renderHook(() => useAccommodationVotes(testPollId));

      expect(result.current.votes).toEqual(existingVotes);
      expect(result.current.getVote(accommodationId)).toBe("up");
    });

    it("handles invalid localStorage data gracefully", () => {
      localStorage.setItem(storageKey, "invalid json{{{");

      const { result } = renderHook(() => useAccommodationVotes(testPollId));

      expect(result.current.votes).toEqual({});
    });

    it("handles malformed vote data gracefully", () => {
      // Invalid vote type
      localStorage.setItem(storageKey, JSON.stringify({ "some-id": "invalid" }));

      const { result } = renderHook(() => useAccommodationVotes(testPollId));

      expect(result.current.votes).toEqual({});
    });

    it("uses poll-specific storage key", () => {
      const pollId1 = "poll-1";
      const pollId2 = "poll-2";
      const accId = crypto.randomUUID();

      localStorage.setItem(
        `${STORAGE_KEY_PREFIX}${pollId1}`,
        JSON.stringify({ [accId]: "up" })
      );
      localStorage.setItem(
        `${STORAGE_KEY_PREFIX}${pollId2}`,
        JSON.stringify({ [accId]: "down" })
      );

      const { result: result1 } = renderHook(() => useAccommodationVotes(pollId1));
      const { result: result2 } = renderHook(() => useAccommodationVotes(pollId2));

      expect(result1.current.getVote(accId)).toBe("up");
      expect(result2.current.getVote(accId)).toBe("down");
    });
  });

  describe("getVote", () => {
    it("returns vote for existing accommodation", () => {
      const accId = crypto.randomUUID();
      localStorage.setItem(storageKey, JSON.stringify({ [accId]: "down" }));

      const { result } = renderHook(() => useAccommodationVotes(testPollId));

      expect(result.current.getVote(accId)).toBe("down");
    });

    it("returns undefined for non-existent accommodation", () => {
      const { result } = renderHook(() => useAccommodationVotes(testPollId));

      expect(result.current.getVote("non-existent")).toBeUndefined();
    });
  });

  describe("setVote", () => {
    it("adds a new vote", () => {
      const accId = crypto.randomUUID();

      const { result } = renderHook(() => useAccommodationVotes(testPollId));

      act(() => {
        result.current.setVote(accId, "up");
      });

      expect(result.current.getVote(accId)).toBe("up");
    });

    it("updates an existing vote", () => {
      const accId = crypto.randomUUID();

      const { result } = renderHook(() => useAccommodationVotes(testPollId));

      act(() => {
        result.current.setVote(accId, "up");
      });

      act(() => {
        result.current.setVote(accId, "down");
      });

      expect(result.current.getVote(accId)).toBe("down");
    });

    it("persists to localStorage", () => {
      const accId = crypto.randomUUID();

      const { result } = renderHook(() => useAccommodationVotes(testPollId));

      act(() => {
        result.current.setVote(accId, "up");
      });

      const stored = JSON.parse(localStorage.getItem(storageKey) ?? "{}");
      expect(stored[accId]).toBe("up");
    });

    it("handles multiple accommodations", () => {
      const accId1 = crypto.randomUUID();
      const accId2 = crypto.randomUUID();

      const { result } = renderHook(() => useAccommodationVotes(testPollId));

      act(() => {
        result.current.setVote(accId1, "up");
        result.current.setVote(accId2, "down");
      });

      expect(result.current.getVote(accId1)).toBe("up");
      expect(result.current.getVote(accId2)).toBe("down");
    });
  });

  describe("clearVote", () => {
    it("removes a vote", () => {
      const accId = crypto.randomUUID();
      localStorage.setItem(storageKey, JSON.stringify({ [accId]: "up" }));

      const { result } = renderHook(() => useAccommodationVotes(testPollId));

      act(() => {
        result.current.clearVote(accId);
      });

      expect(result.current.getVote(accId)).toBeUndefined();
    });

    it("persists removal to localStorage", () => {
      const accId = crypto.randomUUID();
      localStorage.setItem(storageKey, JSON.stringify({ [accId]: "up" }));

      const { result } = renderHook(() => useAccommodationVotes(testPollId));

      act(() => {
        result.current.clearVote(accId);
      });

      const stored = JSON.parse(localStorage.getItem(storageKey) ?? "{}");
      expect(stored[accId]).toBeUndefined();
    });

    it("does nothing for non-existent accommodation", () => {
      const accId = crypto.randomUUID();
      localStorage.setItem(storageKey, JSON.stringify({ [accId]: "up" }));

      const { result } = renderHook(() => useAccommodationVotes(testPollId));

      act(() => {
        result.current.clearVote("non-existent");
      });

      // Original vote should still exist
      expect(result.current.getVote(accId)).toBe("up");
    });

    it("preserves other votes when clearing one", () => {
      const accId1 = crypto.randomUUID();
      const accId2 = crypto.randomUUID();
      localStorage.setItem(
        storageKey,
        JSON.stringify({ [accId1]: "up", [accId2]: "down" })
      );

      const { result } = renderHook(() => useAccommodationVotes(testPollId));

      act(() => {
        result.current.clearVote(accId1);
      });

      expect(result.current.getVote(accId1)).toBeUndefined();
      expect(result.current.getVote(accId2)).toBe("down");
    });
  });

  describe("localStorage errors", () => {
    it("handles localStorage.setItem failure gracefully", () => {
      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = vi.fn(() => {
        throw new Error("QuotaExceeded");
      });

      const accId = crypto.randomUUID();
      const { result } = renderHook(() => useAccommodationVotes(testPollId));

      // Should not throw
      act(() => {
        result.current.setVote(accId, "up");
      });

      // Vote should still be in memory
      expect(result.current.getVote(accId)).toBe("up");

      Storage.prototype.setItem = originalSetItem;
    });

    it("handles localStorage.getItem failure gracefully", () => {
      const originalGetItem = Storage.prototype.getItem;
      Storage.prototype.getItem = vi.fn(() => {
        throw new Error("SecurityError");
      });

      const { result } = renderHook(() => useAccommodationVotes(testPollId));

      // Should start with empty votes
      expect(result.current.votes).toEqual({});

      Storage.prototype.getItem = originalGetItem;
    });
  });

  describe("Zod validation", () => {
    it("rejects non-uuid keys", () => {
      localStorage.setItem(
        storageKey,
        JSON.stringify({ "not-a-uuid": "up" })
      );

      const { result } = renderHook(() => useAccommodationVotes(testPollId));

      expect(result.current.votes).toEqual({});
    });

    it("rejects invalid vote values", () => {
      const accId = crypto.randomUUID();
      localStorage.setItem(
        storageKey,
        JSON.stringify({ [accId]: "maybe" })
      );

      const { result } = renderHook(() => useAccommodationVotes(testPollId));

      expect(result.current.votes).toEqual({});
    });

    it("accepts valid uuid keys with up/down values", () => {
      const accId1 = crypto.randomUUID();
      const accId2 = crypto.randomUUID();
      const validVotes = { [accId1]: "up", [accId2]: "down" };
      localStorage.setItem(storageKey, JSON.stringify(validVotes));

      const { result } = renderHook(() => useAccommodationVotes(testPollId));

      expect(result.current.votes).toEqual(validVotes);
    });
  });
});
