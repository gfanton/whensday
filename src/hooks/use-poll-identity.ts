"use client";

import { useState, useEffect, useCallback } from "react";

export type StoredIdentity = {
  type: "new" | "existing";
  participantId?: string;
  name?: string;
  timestamp: number;
};

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
  useEffect(() => {
    try {
      const stored = localStorage.getItem(getStorageKey(pollId));
      if (stored) {
        const parsed = JSON.parse(stored) as StoredIdentity;
        // Validate the structure
        if (
          parsed &&
          typeof parsed === "object" &&
          (parsed.type === "new" || parsed.type === "existing") &&
          typeof parsed.timestamp === "number"
        ) {
          setIdentityState(parsed);
        }
      }
    } catch {
      // Invalid data in localStorage, ignore
      console.error("Failed to parse stored identity");
    }
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
