"use client";

import type { ReactElement } from "react";
import { useState, useCallback } from "react";
import { VoteGrid } from "@/components/vote-grid";
import { VoteCalendar } from "@/components/vote-calendar";
import { VoteForm } from "./vote-form";
import { IdentitySelector } from "@/components/identity-selector";
import { AccommodationSection } from "@/components/accommodation-section";
import { usePollIdentity, type StoredIdentity } from "@/hooks/use-poll-identity";
import type { AccommodationData } from "@/db";
import { useCreatedPolls } from "@/hooks/use-created-polls";
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
  accommodations: AccommodationData[];
};

type FlowState = "selecting_identity" | "voting";

export function VoteSection({ doodle, votes, accommodations }: VoteSectionProps): ReactElement {
  const { identity, isLoading, setIdentity, clearIdentity } = usePollIdentity(
    doodle.id
  );
  const { getOwnerKey } = useCreatedPolls();
  const [flowState, setFlowState] = useState<FlowState>("selecting_identity");

  // Check if current user is the poll owner
  const ownerKey = getOwnerKey(doodle.id);
  const isOwner = ownerKey !== undefined;

  // Find current user's vote if they're an existing participant
  const currentUserVote =
    identity?.type === "existing" && identity.participantId !== undefined
      ? votes.find((v) => v.id === identity.participantId)
      : undefined;

  // Determine if current user has voted (for visibility settings)
  const currentUserVoted = Boolean(currentUserVote) || identity?.type === "new";

  const [justSelectedIdentity, setJustSelectedIdentity] = useState(false);

  const handleIdentitySelected = useCallback(
    (newIdentity: StoredIdentity) => {
      setIdentity(newIdentity);
      setFlowState("voting");
      setJustSelectedIdentity(true);
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
      {/* Vote form first */}
      <section className="rounded-lg border border-surface1 bg-mantle p-6">
        <h2 className="text-lg font-semibold text-text mb-4">
          {currentUserVote ? "Update Your Vote" : "Add Your Vote"}
        </h2>

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
            onChangeIdentity={handleChangeIdentity}
            initialExpanded={justSelectedIdentity ? true : undefined}
          />
        )}
      </section>

      {/* Votes grid */}
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

      {/* Calendar overview */}
      <section className="rounded-lg border border-surface1 bg-mantle p-6">
        <VoteCalendar
          dates={doodle.dates}
          pattern={doodle.pattern}
          votes={votes}
          currentUserResponses={currentUserVote?.responses}
        />
      </section>

      <AccommodationSection
        doodleId={doodle.id}
        accommodations={accommodations}
        isOwner={isOwner}
        ownerKey={ownerKey}
        userName={identity?.name}
      />
    </div>
  );
}
