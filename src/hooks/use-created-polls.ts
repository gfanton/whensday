"use client";

import { useState, useEffect, useCallback } from "react";
import { z } from "zod";

// ---- Constants

const STORAGE_KEY = "whensday:created-polls";
const MAX_STORED_POLLS = 50;

// ---- Zod Schema (Single Source of Truth)

const CreatedPollSchema = z.object({
  id: z.string().uuid(),
  ownerKey: z.string().uuid(),
  title: z.string(),
  createdAt: z.number(),
});

const CreatedPollsSchema = z.array(CreatedPollSchema);

export type CreatedPoll = z.infer<typeof CreatedPollSchema>;

// ---- Hook

type UseCreatedPollsReturn = {
  polls: CreatedPoll[];
  isLoading: boolean;
  addPoll: (poll: CreatedPoll) => void;
  removePoll: (pollId: string) => void;
  getOwnerKey: (pollId: string) => string | undefined;
};

export function useCreatedPolls(): UseCreatedPollsReturn {
  const [polls, setPolls] = useState<CreatedPoll[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load polls from localStorage on mount
  useEffect(() => {
    let loaded: CreatedPoll[] = [];

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) {
        const result = CreatedPollsSchema.safeParse(JSON.parse(stored));
        if (result.success) {
          loaded = result.data;
        }
      }
    } catch {
      // Silently fail - localStorage might be unavailable or corrupted
    }

    setPolls(loaded); // eslint-disable-line react-hooks/set-state-in-effect -- Hydration: sync with localStorage
    setIsLoading(false);
  }, []);

  const savePolls = useCallback((newPolls: CreatedPoll[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newPolls));
    } catch {
      // Silently fail on quota exceeded or unavailable localStorage
    }
  }, []);

  const addPoll = useCallback(
    (poll: CreatedPoll) => {
      setPolls((current) => {
        // Add new poll at the beginning
        let updated = [poll, ...current.filter((p) => p.id !== poll.id)];

        // Enforce max limit (FIFO cleanup)
        if (updated.length > MAX_STORED_POLLS) {
          updated = updated.slice(0, MAX_STORED_POLLS);
        }

        savePolls(updated);
        return updated;
      });
    },
    [savePolls]
  );

  const removePoll = useCallback(
    (pollId: string) => {
      setPolls((current) => {
        const updated = current.filter((p) => p.id !== pollId);
        savePolls(updated);
        return updated;
      });
    },
    [savePolls]
  );

  const getOwnerKey = useCallback(
    (pollId: string): string | undefined => {
      const poll = polls.find((p) => p.id === pollId);
      return poll?.ownerKey;
    },
    [polls]
  );

  return {
    polls,
    isLoading,
    addPoll,
    removePoll,
    getOwnerKey,
  };
}
