import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCreatedPolls, type CreatedPoll } from "./use-created-polls";

const STORAGE_KEY = "whensday:created-polls";

function createTestPoll(overrides: Partial<CreatedPoll> = {}): CreatedPoll {
  return {
    id: crypto.randomUUID(),
    ownerKey: crypto.randomUUID(),
    title: "Test Poll",
    createdAt: Date.now(),
    ...overrides,
  };
}

describe("useCreatedPolls", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe("initial state", () => {
    it("starts with empty polls when localStorage is empty", () => {
      const { result } = renderHook(() => useCreatedPolls());

      // After effect runs, should have empty polls and not loading
      expect(result.current.isLoading).toBe(false);
      expect(result.current.polls).toHaveLength(0);
    });

    it("loads polls from localStorage", () => {
      const existingPoll = createTestPoll();
      localStorage.setItem(STORAGE_KEY, JSON.stringify([existingPoll]));

      const { result } = renderHook(() => useCreatedPolls());

      // Wait for effect to run
      expect(result.current.polls).toHaveLength(1);
      expect(result.current.polls[0]?.id).toBe(existingPoll.id);
    });

    it("handles invalid localStorage data gracefully", () => {
      localStorage.setItem(STORAGE_KEY, "invalid json{{{");

      const { result } = renderHook(() => useCreatedPolls());

      expect(result.current.polls).toHaveLength(0);
    });

    it("handles malformed poll data gracefully", () => {
      // Missing required fields
      localStorage.setItem(STORAGE_KEY, JSON.stringify([{ id: "not-a-uuid" }]));

      const { result } = renderHook(() => useCreatedPolls());

      expect(result.current.polls).toHaveLength(0);
    });
  });

  describe("addPoll", () => {
    it("adds a new poll to the list", () => {
      const { result } = renderHook(() => useCreatedPolls());
      const newPoll = createTestPoll();

      act(() => {
        result.current.addPoll(newPoll);
      });

      expect(result.current.polls).toHaveLength(1);
      expect(result.current.polls[0]?.id).toBe(newPoll.id);
    });

    it("adds new poll at the beginning", () => {
      const poll1 = createTestPoll({ title: "First" });
      const poll2 = createTestPoll({ title: "Second" });

      const { result } = renderHook(() => useCreatedPolls());

      act(() => {
        result.current.addPoll(poll1);
      });

      act(() => {
        result.current.addPoll(poll2);
      });

      expect(result.current.polls[0]?.title).toBe("Second");
      expect(result.current.polls[1]?.title).toBe("First");
    });

    it("persists to localStorage", () => {
      const { result } = renderHook(() => useCreatedPolls());
      const newPoll = createTestPoll();

      act(() => {
        result.current.addPoll(newPoll);
      });

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
      expect(stored).toHaveLength(1);
      expect(stored[0].id).toBe(newPoll.id);
    });

    it("replaces existing poll with same id", () => {
      const pollId = crypto.randomUUID();
      const poll1 = createTestPoll({ id: pollId, title: "Original" });
      const poll2 = createTestPoll({ id: pollId, title: "Updated" });

      const { result } = renderHook(() => useCreatedPolls());

      act(() => {
        result.current.addPoll(poll1);
      });

      act(() => {
        result.current.addPoll(poll2);
      });

      expect(result.current.polls).toHaveLength(1);
      expect(result.current.polls[0]?.title).toBe("Updated");
    });

    it("enforces max 50 polls limit", () => {
      const { result } = renderHook(() => useCreatedPolls());

      // Add 55 polls
      act(() => {
        for (let i = 0; i < 55; i++) {
          result.current.addPoll(createTestPoll({ title: `Poll ${i}` }));
        }
      });

      expect(result.current.polls).toHaveLength(50);
      // Most recent should be first
      expect(result.current.polls[0]?.title).toBe("Poll 54");
    });
  });

  describe("removePoll", () => {
    it("removes a poll by id", () => {
      const poll = createTestPoll();
      localStorage.setItem(STORAGE_KEY, JSON.stringify([poll]));

      const { result } = renderHook(() => useCreatedPolls());

      act(() => {
        result.current.removePoll(poll.id);
      });

      expect(result.current.polls).toHaveLength(0);
    });

    it("persists removal to localStorage", () => {
      const poll = createTestPoll();
      localStorage.setItem(STORAGE_KEY, JSON.stringify([poll]));

      const { result } = renderHook(() => useCreatedPolls());

      act(() => {
        result.current.removePoll(poll.id);
      });

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
      expect(stored).toHaveLength(0);
    });

    it("does nothing for non-existent id", () => {
      const poll = createTestPoll();
      localStorage.setItem(STORAGE_KEY, JSON.stringify([poll]));

      const { result } = renderHook(() => useCreatedPolls());

      act(() => {
        result.current.removePoll("non-existent-id");
      });

      expect(result.current.polls).toHaveLength(1);
    });
  });

  describe("getOwnerKey", () => {
    it("returns owner key for existing poll", () => {
      const poll = createTestPoll();
      localStorage.setItem(STORAGE_KEY, JSON.stringify([poll]));

      const { result } = renderHook(() => useCreatedPolls());

      expect(result.current.getOwnerKey(poll.id)).toBe(poll.ownerKey);
    });

    it("returns undefined for non-existent poll", () => {
      const { result } = renderHook(() => useCreatedPolls());

      expect(result.current.getOwnerKey("non-existent")).toBeUndefined();
    });
  });

  describe("localStorage errors", () => {
    it("handles localStorage.setItem failure gracefully", () => {
      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = vi.fn(() => {
        throw new Error("QuotaExceeded");
      });

      const { result } = renderHook(() => useCreatedPolls());
      const poll = createTestPoll();

      // Should not throw
      act(() => {
        result.current.addPoll(poll);
      });

      // Poll should still be in memory
      expect(result.current.polls).toHaveLength(1);

      Storage.prototype.setItem = originalSetItem;
    });
  });
});
