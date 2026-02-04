"use client";

import { useState, useCallback, useSyncExternalStore } from "react";
import { z } from "zod";

// ---- Constants

const STORAGE_KEY_PREFIX = "whensday:accommodation-votes:";

// ---- Zod Schema (Single Source of Truth)

const AccommodationVotesSchema = z.record(
  z.string().uuid(),
  z.enum(["up", "down"])
);

type AccommodationVotes = z.infer<typeof AccommodationVotesSchema>;

// ---- Helper to load votes from localStorage

function loadVotesFromStorage(storageKey: string): AccommodationVotes {
  if (typeof window === "undefined") return {};
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored !== null) {
      const result = AccommodationVotesSchema.safeParse(JSON.parse(stored));
      if (result.success) {
        return result.data;
      }
    }
  } catch {
    // Silently fail - localStorage might be unavailable or corrupted
  }
  return {};
}

// ---- Hook

type UseAccommodationVotesReturn = {
  votes: AccommodationVotes;
  isLoading: boolean;
  getVote: (accommodationId: string) => "up" | "down" | undefined;
  setVote: (accommodationId: string, vote: "up" | "down") => void;
  clearVote: (accommodationId: string) => void;
};

export function useAccommodationVotes(pollId: string): UseAccommodationVotesReturn {
  const storageKey = `${STORAGE_KEY_PREFIX}${pollId}`;

  // Use lazy initialization to avoid setState in useEffect
  const [votes, setVotes] = useState<AccommodationVotes>(() =>
    loadVotesFromStorage(storageKey)
  );

  // Use useSyncExternalStore to properly detect hydration state
  const isHydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const isLoading = !isHydrated;

  const saveVotes = useCallback(
    (newVotes: AccommodationVotes) => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(newVotes));
      } catch {
        // Silently fail on quota exceeded or unavailable localStorage
      }
    },
    [storageKey]
  );

  // Explicit getter that handles undefined access safely (noUncheckedIndexedAccess)
  const getVote = useCallback(
    (accommodationId: string): "up" | "down" | undefined => {
      return votes[accommodationId];
    },
    [votes]
  );

  const setVote = useCallback(
    (accommodationId: string, vote: "up" | "down") => {
      setVotes((current) => {
        const updated = { ...current, [accommodationId]: vote };
        saveVotes(updated);
        return updated;
      });
    },
    [saveVotes]
  );

  const clearVote = useCallback(
    (accommodationId: string) => {
      setVotes((current) => {
        const updated = { ...current };
        delete updated[accommodationId];
        saveVotes(updated);
        return updated;
      });
    },
    [saveVotes]
  );

  return {
    votes,
    isLoading,
    getVote,
    setVote,
    clearVote,
  };
}
