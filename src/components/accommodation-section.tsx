"use client";

import type { ReactElement, FormEvent } from "react";
import { useState, useEffect, useRef, useActionState, startTransition } from "react";
import type { AccommodationData } from "@/db";
import { AccommodationCard } from "./accommodation-card";
import { useAccommodationVotes } from "@/hooks/use-accommodation-votes";
import { MetadataSchema, type Metadata } from "@/lib/opengraph";
import {
  submitAccommodation,
  voteAccommodation,
  deleteAccommodation,
  type AccommodationActionState,
  type ActionState,
} from "@/app/actions";

type AccommodationSectionProps = {
  doodleId: string;
  accommodations: AccommodationData[];
  isOwner: boolean;
  ownerKey?: string;
  userName?: string;
};

export function AccommodationSection({
  doodleId,
  accommodations,
  isOwner,
  ownerKey,
  userName,
}: AccommodationSectionProps): ReactElement {
  const { getVote, setVote, clearVote, isLoading: votesLoading } = useAccommodationVotes(doodleId);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [urlMetadata, setUrlMetadata] = useState<Metadata | null>(null);
  const [isFetchingMetadata, setIsFetchingMetadata] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  // Track pending vote for rollback on failure
  const pendingVoteRef = useRef<{ id: string; previousVote: "up" | "down" | undefined } | null>(null);
  // AbortController for fetch cleanup
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup fetch on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  // Can only suggest if user has selected an identity
  const canSuggest = userName !== undefined && userName.length > 0;

  const [submitState, submitAction, isSubmitting] = useActionState<
    AccommodationActionState,
    FormData
  >(submitAccommodation, null);
  const [voteState, voteAction] = useActionState<ActionState, FormData>(
    voteAccommodation,
    null
  );
  const [deleteState, deleteAction, isDeleting] = useActionState<ActionState, FormData>(
    deleteAccommodation,
    null
  );

  // Reset form on successful submission
  useEffect(() => {
    if (submitState?.status === "success") {
      formRef.current?.reset();
      setIsFormOpen(false);
      setUrlMetadata(null);
    }
  }, [submitState]);

  async function fetchUrlMetadata(url: string, signal?: AbortSignal): Promise<void> {
    setIsFetchingMetadata(true);
    try {
      const response = await fetch(`/api/metadata?url=${encodeURIComponent(url)}`, { signal });
      if (response.ok) {
        const json: unknown = await response.json();
        const result = MetadataSchema.safeParse(json);
        if (result.success) {
          setUrlMetadata(result.data);
        }
      }
    } catch (error) {
      // Silently fail - metadata is optional (ignore AbortError)
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }
    } finally {
      setIsFetchingMetadata(false);
    }
  }

  function handleUrlBlur(e: React.FocusEvent<HTMLInputElement>): void {
    const url = e.target.value;
    if (url && url.startsWith("https://")) {
      // Cancel any pending fetch
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();
      void fetchUrlMetadata(url, abortControllerRef.current.signal);
    }
  }

  // Rollback optimistic vote on failure
  useEffect(() => {
    if (voteState?.status === "error" && pendingVoteRef.current !== null) {
      const { id, previousVote } = pendingVoteRef.current;
      if (previousVote !== undefined) {
        setVote(id, previousVote);
      } else {
        clearVote(id);
      }
      pendingVoteRef.current = null;
    } else if (voteState?.status === "success") {
      pendingVoteRef.current = null;
    }
  }, [voteState, setVote, clearVote]);

  function handleSubmit(e: FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.append("doodleId", doodleId);

    // Add scraped metadata if available
    if (urlMetadata !== null) {
      if (urlMetadata.title !== null) formData.append("title", urlMetadata.title);
      if (urlMetadata.description !== null) formData.append("description", urlMetadata.description);
      if (urlMetadata.imageUrl !== null) formData.append("imageUrl", urlMetadata.imageUrl);
      if (urlMetadata.siteName !== null) formData.append("siteName", urlMetadata.siteName);
    }

    startTransition(() => {
      submitAction(formData);
    });
  }

  function handleVote(accommodationId: string, voteType: "up" | "down"): void {
    const previousVote = getVote(accommodationId);

    // Don't allow voting the same way twice
    if (previousVote === voteType) {
      return;
    }

    const formData = new FormData();
    formData.append("accommodationId", accommodationId);
    formData.append("voteType", voteType);
    if (previousVote !== undefined) {
      formData.append("previousVote", previousVote);
    }

    // Track pending vote for potential rollback
    pendingVoteRef.current = { id: accommodationId, previousVote };

    // Optimistically update local vote state
    setVote(accommodationId, voteType);

    startTransition(() => {
      voteAction(formData);
    });
  }

  function handleDelete(accommodationId: string): void {
    if (ownerKey === undefined) return;

    const formData = new FormData();
    formData.append("accommodationId", accommodationId);
    formData.append("ownerKey", ownerKey);

    startTransition(() => {
      deleteAction(formData);
    });
  }

  // Sort accommodations by net score (upvotes - downvotes)
  const sortedAccommodations = [...accommodations].sort((a, b) => {
    const scoreA = (a.upvotes ?? 0) - (a.downvotes ?? 0);
    const scoreB = (b.upvotes ?? 0) - (b.downvotes ?? 0);
    return scoreB - scoreA;
  });

  return (
    <section className="rounded-lg border border-surface1 bg-mantle p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-text">Accommodation Suggestions</h2>
        {accommodations.length < 20 && !isFormOpen && canSuggest && (
          <button
            type="button"
            onClick={() => setIsFormOpen(true)}
            className="text-sm text-blue hover:text-sapphire transition-colors"
          >
            + Suggest accommodation
          </button>
        )}
      </div>

      {!canSuggest && accommodations.length === 0 && (
        <p className="text-overlay1 text-center py-4 text-sm">
          Select your name above to suggest accommodations.
        </p>
      )}

      {/* Error messages */}
      {submitState?.status === "error" && (
        <p className="mb-4 text-sm text-red">{submitState.message}</p>
      )}
      {voteState?.status === "error" && (
        <p className="mb-4 text-sm text-red">{voteState.message}</p>
      )}
      {deleteState?.status === "error" && (
        <p className="mb-4 text-sm text-red">{deleteState.message}</p>
      )}

      {/* Suggestion form */}
      {isFormOpen && canSuggest && (
        <form ref={formRef} onSubmit={handleSubmit} className="mb-6 space-y-4">
          <input type="hidden" name="submitterName" value={userName} />

          <div>
            <label htmlFor="url" className="block text-sm font-medium text-subtext1">
              Accommodation URL
            </label>
            <input
              type="url"
              id="url"
              name="url"
              required
              placeholder="https://www.airbnb.com/rooms/..."
              onBlur={handleUrlBlur}
              className="mt-1 block w-full rounded-md border border-surface1 bg-base px-3 py-2 text-text placeholder:text-overlay0 shadow-sm focus:border-blue focus:outline-none focus:ring-1 focus:ring-blue"
            />
            <p className="mt-1 text-xs text-overlay0">
              Paste a link to Airbnb, Booking.com, or any accommodation website
            </p>
          </div>

          {/* URL Preview */}
          {isFetchingMetadata && (
            <div className="text-sm text-overlay1">Fetching preview...</div>
          )}
          {urlMetadata !== null && !isFetchingMetadata && (
            <div className="rounded-md border border-surface1 bg-surface0 p-3">
              <div className="flex gap-3">
                {urlMetadata.imageUrl && (
                  <div className="flex-shrink-0 w-20 h-20 rounded overflow-hidden bg-surface1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={urlMetadata.imageUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text truncate">
                    {urlMetadata.title ?? "No title"}
                  </p>
                  {urlMetadata.siteName && (
                    <p className="text-xs text-overlay1">{urlMetadata.siteName}</p>
                  )}
                  {urlMetadata.description && (
                    <p className="text-xs text-overlay0 mt-1 line-clamp-2">
                      {urlMetadata.description}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div>
            <label htmlFor="comment" className="block text-sm font-medium text-subtext1">
              Comment (optional)
            </label>
            <textarea
              id="comment"
              name="comment"
              rows={2}
              maxLength={500}
              placeholder="Why do you recommend this place?"
              className="mt-1 block w-full rounded-md border border-surface1 bg-base px-3 py-2 text-text placeholder:text-overlay0 shadow-sm focus:border-blue focus:outline-none focus:ring-1 focus:ring-blue"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-overlay1">Suggesting as {userName}</span>
            <div className="flex-1" />
            <button
              type="button"
              onClick={() => {
                setIsFormOpen(false);
                setUrlMetadata(null);
              }}
              className="rounded-md bg-surface1 px-4 py-2 text-subtext1 font-medium hover:bg-surface2 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isFetchingMetadata}
              className="rounded-md bg-blue px-4 py-2 text-crust font-medium hover:bg-sapphire disabled:bg-surface1 disabled:text-overlay0 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? "Submitting..." : "Submit"}
            </button>
          </div>
        </form>
      )}

      {/* Accommodation list */}
      {votesLoading ? (
        <div className="text-center py-4 text-overlay1">Loading...</div>
      ) : sortedAccommodations.length === 0 ? (
        <p className="text-overlay1 text-center py-8">
          No accommodation suggestions yet. Be the first to suggest one!
        </p>
      ) : (
        <div className="space-y-3">
          {sortedAccommodations.map((accommodation) => (
            <AccommodationCard
              key={accommodation.id}
              accommodation={accommodation}
              currentVote={getVote(accommodation.id)}
              onVote={handleVote}
              onDelete={isOwner ? handleDelete : undefined}
              isDeleting={isDeleting}
            />
          ))}
        </div>
      )}

      {accommodations.length >= 20 && (
        <p className="mt-4 text-sm text-overlay0 text-center">
          Maximum number of suggestions reached (20).
        </p>
      )}
    </section>
  );
}
