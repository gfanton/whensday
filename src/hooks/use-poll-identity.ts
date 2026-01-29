"use client";

import { useState, useEffect, useCallback } from "react";
import { z } from "zod";

// ---- Zod Schema (Single Source of Truth)

const StoredIdentitySchema = z.object({
  type: z.enum(["new", "existing"]),
  participantId: z.string().optional(),
  name: z.string().optional(),
  timestamp: z.number(),
});

export type StoredIdentity = z.infer<typeof StoredIdentitySchema>;

type UsePollIdentityReturn = {
  identity: StoredIdentity | null;
  isLoading: boolean;
  setIdentity: (identity: StoredIdentity) => void;
  clearIdentity: () => void;
};

function getStorageKey(pollId: string): string {
  return `daadle:poll:${pollId}:identity`;
}

export function usePollIdentity(pollId: string): UsePollIdentityReturn {
  const [identity, setIdentityState] = useState<StoredIdentity | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load identity from localStorage on mount
  // This is a standard hydration pattern - we intentionally call setState once
  // on mount to sync React state with localStorage. This is not a cascading
  // render issue since it only runs once per pollId change.
  useEffect(() => {
    let parsedIdentity: StoredIdentity | null = null;

    try {
      const stored = localStorage.getItem(getStorageKey(pollId));
      if (stored !== null) {
        const result = StoredIdentitySchema.safeParse(JSON.parse(stored));
        if (result.success) {
          parsedIdentity = result.data;
        }
      }
    } catch {
      console.error("Failed to parse stored identity");
    }

    setIdentityState(parsedIdentity); // eslint-disable-line react-hooks/set-state-in-effect -- Hydration: sync with localStorage
    setIsLoading(false);
  }, [pollId]);

  const setIdentity = useCallback(
    (newIdentity: StoredIdentity) => {
      try {
        localStorage.setItem(getStorageKey(pollId), JSON.stringify(newIdentity));
        setIdentityState(newIdentity);
      } catch {
        console.error("Failed to save identity to localStorage");
      }
    },
    [pollId]
  );

  const clearIdentity = useCallback(() => {
    try {
      localStorage.removeItem(getStorageKey(pollId));
      setIdentityState(null);
    } catch {
      console.error("Failed to clear identity from localStorage");
    }
  }, [pollId]);

  return {
    identity,
    isLoading,
    setIdentity,
    clearIdentity,
  };
}
