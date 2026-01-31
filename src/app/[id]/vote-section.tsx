"use client";

import type { ReactElement } from "react";
import { useState, useCallback } from "react";
import { VoteGrid } from "@/components/vote-grid";
import { VoteCalendar } from "@/components/vote-calendar";
import { VoteForm } from "./vote-form";
import { IdentitySelector } from "@/components/identity-selector";
import { usePollIdentity, type StoredIdentity } from "@/hooks/use-poll-identity";
import type { DoodleDates, DatePattern } from "@/db/types";

// Serializable types for client components (no Date objects)
type SerializableDoodle = {
  id: string;
  title: string;
  description: string | null;
  dates: DoodleDates;
  pattern?: DatePattern | null;
  requireAllDates: boolean | null;
  allowMaybe: boolean | null;
  hideParticipants: boolean | null;
  hideScores: boolean | null;
};

type SerializableVote = {
  id: string;
  doodleId: string;
  participantName: string;
  responses: Record<string, "yes" | "maybe" | "no" | undefined>;
};

type VoteSectionProps = {
  doodle: SerializableDoodle;
  votes: SerializableVote[];
};

type FlowState = "selecting_identity" | "voting";

export function VoteSection({ doodle, votes }: VoteSectionProps): ReactElement {
  const { identity, isLoading, setIdentity, clearIdentity } = usePollIdentity(
    doodle.id
  );
  const [flowState, setFlowState] = useState<FlowState>("selecting_identity");

  // Find current user's vote if they're an existing participant
  const currentUserVote =
    identity?.type === "existing" && identity.participantId
      ? votes.find((v) => v.id === identity.participantId)
      : null;

  // Determine if current user has voted (for visibility settings)
  const currentUserVoted = Boolean(currentUserVote) || identity?.type === "new";

  const handleIdentitySelected = useCallback(
    (newIdentity: StoredIdentity) => {
      setIdentity(newIdentity);
      setFlowState("voting");
    },
    [setIdentity]
  );

  const handleChangeIdentity = useCallback(() => {
    clearIdentity();
    setFlowState("selecting_identity");
  }, [clearIdentity]);

  const handleVoteSuccess = useCallback(
    (participantId: string) => {
      // Update identity with the new participantId
      setIdentity({
        type: "existing",
        participantId,
        name: identity?.name,
        timestamp: Date.now(),
      });
    },
    [identity?.name, setIdentity]
  );

  // Show loading state while checking localStorage
  if (isLoading) {
    return (
      <div className="space-y-8">
        <section className="rounded-lg border border-surface1 bg-mantle p-6">
          <h2 className="mb-4 text-lg font-semibold text-text">Votes</h2>
          <VoteGrid
            dates={doodle.dates}
            pattern={doodle.pattern}
            votes={votes}
            hideParticipants={doodle.hideParticipants ?? false}
            hideScores={doodle.hideScores ?? false}
            currentUserVoted={false}
          />
        </section>

        <section className="rounded-lg border border-surface1 bg-mantle p-6">
          <h2 className="mb-4 text-lg font-semibold text-text">Add Your Vote</h2>
          <div className="text-center py-4 text-overlay1">Loading...</div>
        </section>
      </div>
    );
  }

  // Determine actual flow state
  // If we have a saved identity with a valid participant, go straight to voting
  const effectiveFlowState =
    identity?.type === "existing" &&
    identity.participantId &&
    votes.some((v) => v.id === identity.participantId)
      ? "voting"
      : flowState;

  return (
    <div className="space-y-8">
      <section className="rounded-lg border border-surface1 bg-mantle p-6">
        <h2 className="mb-4 text-lg font-semibold text-text">Votes</h2>
        <VoteGrid
          dates={doodle.dates}
          pattern={doodle.pattern}
          votes={votes}
          hideParticipants={doodle.hideParticipants ?? false}
          hideScores={doodle.hideScores ?? false}
          currentUserVoted={currentUserVoted}
        />
      </section>

      <section className="rounded-lg border border-surface1 bg-mantle p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-text">
            {currentUserVote ? "Update Your Vote" : "Add Your Vote"}
          </h2>
          {effectiveFlowState === "voting" && identity && (
            <button
              type="button"
              onClick={handleChangeIdentity}
              className="text-sm text-overlay1 hover:text-subtext1 underline"
            >
              Change identity
            </button>
          )}
        </div>

        {effectiveFlowState === "selecting_identity" ? (
          <IdentitySelector
            existingParticipants={votes}
            savedIdentity={identity}
            onIdentitySelected={handleIdentitySelected}
          />
        ) : (
          <VoteForm
            doodle={{
              id: doodle.id,
              dates: doodle.dates,
              pattern: doodle.pattern,
              allowMaybe: doodle.allowMaybe ?? true,
              requireAllDates: doodle.requireAllDates ?? false,
            }}
            initialName={identity?.name}
            initialResponses={currentUserVote?.responses}
            participantId={currentUserVote?.id}
            onSuccess={handleVoteSuccess}
          />
        )}
      </section>

      <section className="rounded-lg border border-surface1 bg-mantle p-6">
        <VoteCalendar
          dates={doodle.dates}
          pattern={doodle.pattern}
          votes={votes}
          currentUserResponses={currentUserVote?.responses}
        />
      </section>
    </div>
  );
}
