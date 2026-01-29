"use client";

import type { ReactElement } from "react";
import { useState } from "react";
import type { StoredIdentity } from "@/hooks/use-poll-identity";

// Minimal participant info needed for identity selection
type Participant = {
  id: string;
  participantName: string;
};

type IdentitySelectorProps = {
  existingParticipants: Participant[];
  savedIdentity: StoredIdentity | null;
  onIdentitySelected: (identity: StoredIdentity) => void;
};

export function IdentitySelector({
  existingParticipants,
  savedIdentity,
  onIdentitySelected,
}: IdentitySelectorProps): ReactElement {
  const [mode, setMode] = useState<"select" | "new" | "existing">("select");
  const [name, setName] = useState(savedIdentity?.name ?? "");
  const [selectedParticipantId, setSelectedParticipantId] = useState<string>(
    savedIdentity?.participantId ?? ""
  );

  // If we have a saved identity, try to restore it automatically
  // but only if the participant still exists
  const savedParticipant = savedIdentity?.participantId
    ? existingParticipants.find((p) => p.id === savedIdentity.participantId)
    : null;

  function handleNewSubmit(): void {
    if (!name.trim()) return;
    onIdentitySelected({
      type: "new",
      name: name.trim(),
      timestamp: Date.now(),
    });
  }

  function handleExistingSubmit(): void {
    if (!selectedParticipantId) return;
    const participant = existingParticipants.find(
      (p) => p.id === selectedParticipantId
    );
    if (!participant) return;
    onIdentitySelected({
      type: "existing",
      participantId: participant.id,
      name: participant.participantName,
      timestamp: Date.now(),
    });
  }

  // If there's a saved participant that still exists, show quick restore option
  if (savedParticipant && mode === "select") {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-blue/30 bg-blue/10 p-4">
          <p className="text-sm text-subtext1 mb-3">
            Welcome back, <span className="font-medium text-text">{savedParticipant.participantName}</span>!
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() =>
                onIdentitySelected({
                  type: "existing",
                  participantId: savedParticipant.id,
                  name: savedParticipant.participantName,
                  timestamp: Date.now(),
                })
              }
              className="flex-1 rounded-md bg-blue px-4 py-2 text-sm text-crust font-medium hover:bg-sapphire transition-colors"
            >
              Continue as {savedParticipant.participantName}
            </button>
            <button
              type="button"
              onClick={() => setMode("select")}
              className="rounded-md bg-surface0 px-4 py-2 text-sm text-subtext1 hover:bg-surface1 transition-colors"
            >
              Change
            </button>
          </div>
        </div>

        <div className="text-center">
          <button
            type="button"
            onClick={() => setMode("new")}
            className="text-sm text-overlay1 hover:text-subtext1 underline"
          >
            Or vote as someone new
          </button>
        </div>
      </div>
    );
  }

  // Selection mode
  if (mode === "select") {
    return (
      <div className="space-y-4">
        <p className="text-sm text-subtext1">How would you like to vote?</p>

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setMode("new")}
            className="rounded-lg border border-surface1 bg-surface0 p-4 text-left hover:border-blue hover:bg-surface1 transition-colors"
          >
            <span className="block text-sm font-medium text-text">
              I&apos;m new here
            </span>
            <span className="block text-xs text-overlay1 mt-1">
              Enter your name to vote
            </span>
          </button>

          {existingParticipants.length > 0 && (
            <button
              type="button"
              onClick={() => setMode("existing")}
              className="rounded-lg border border-surface1 bg-surface0 p-4 text-left hover:border-blue hover:bg-surface1 transition-colors"
            >
              <span className="block text-sm font-medium text-text">
                I already voted
              </span>
              <span className="block text-xs text-overlay1 mt-1">
                Update your existing vote
              </span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // New participant mode
  if (mode === "new") {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMode("select")}
            className="text-overlay1 hover:text-subtext1"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <p className="text-sm font-medium text-subtext1">Enter your name</p>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="John Doe"
            maxLength={100}
            className="flex-1 rounded-md border border-surface1 bg-surface0 px-3 py-2 text-text placeholder:text-overlay0 shadow-sm focus:border-blue focus:outline-none focus:ring-1 focus:ring-blue"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleNewSubmit();
              }
            }}
          />
          <button
            type="button"
            onClick={handleNewSubmit}
            disabled={!name.trim()}
            className="rounded-md bg-blue px-4 py-2 text-crust font-medium hover:bg-sapphire disabled:bg-surface1 disabled:text-overlay0 disabled:cursor-not-allowed transition-colors"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  // Existing participant mode
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setMode("select")}
          className="text-overlay1 hover:text-subtext1"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <p className="text-sm font-medium text-subtext1">Select your name</p>
      </div>

      <div className="flex gap-2">
        <select
          value={selectedParticipantId}
          onChange={(e) => setSelectedParticipantId(e.target.value)}
          className="flex-1 rounded-md border border-surface1 bg-surface0 px-3 py-2 text-text shadow-sm focus:border-blue focus:outline-none focus:ring-1 focus:ring-blue"
        >
          <option value="">Select a participant...</option>
          {existingParticipants.map((participant) => (
            <option key={participant.id} value={participant.id}>
              {participant.participantName}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleExistingSubmit}
          disabled={!selectedParticipantId}
          className="rounded-md bg-blue px-4 py-2 text-crust font-medium hover:bg-sapphire disabled:bg-surface1 disabled:text-overlay0 disabled:cursor-not-allowed transition-colors"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
