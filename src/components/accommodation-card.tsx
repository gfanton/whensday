"use client";

import type { ReactElement } from "react";
import type { AccommodationData } from "@/db";

type AccommodationCardProps = {
  accommodation: AccommodationData;
  currentVote: "up" | "down" | undefined;
  onVote: (id: string, type: "up" | "down") => void;
  onDelete?: (id: string) => void;
  isDeleting?: boolean;
};

export function AccommodationCard({
  accommodation,
  currentVote,
  onVote,
  onDelete,
  isDeleting = false,
}: AccommodationCardProps): ReactElement {
  const netScore = (accommodation.upvotes ?? 0) - (accommodation.downvotes ?? 0);

  return (
    <div className="rounded-lg border border-surface1 bg-surface0 p-4">
      <div className="flex gap-4">
        {/* Vote buttons */}
        <div className="flex flex-col items-center gap-1">
          <button
            type="button"
            onClick={() => onVote(accommodation.id, "up")}
            className={`h-8 w-8 rounded flex items-center justify-center transition-colors ${
              currentVote === "up"
                ? "bg-green text-crust"
                : "bg-surface1 text-overlay1 hover:bg-surface2 hover:text-text"
            }`}
            aria-label="Upvote"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 15l7-7 7 7"
              />
            </svg>
          </button>
          <span
            className={`text-sm font-medium ${
              netScore > 0
                ? "text-green"
                : netScore < 0
                  ? "text-red"
                  : "text-overlay1"
            }`}
          >
            {netScore}
          </span>
          <button
            type="button"
            onClick={() => onVote(accommodation.id, "down")}
            className={`h-8 w-8 rounded flex items-center justify-center transition-colors ${
              currentVote === "down"
                ? "bg-red text-crust"
                : "bg-surface1 text-overlay1 hover:bg-surface2 hover:text-text"
            }`}
            aria-label="Downvote"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-3">
            {/* Thumbnail */}
            {accommodation.imageUrl && (
              <div className="hidden sm:block flex-shrink-0 w-24 h-24 rounded overflow-hidden bg-surface1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={accommodation.imageUrl}
                  alt=""
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            )}

            {/* Text content */}
            <div className="flex-1 min-w-0">
              <a
                href={accommodation.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue hover:text-sapphire font-medium block truncate"
              >
                {accommodation.title ?? accommodation.url}
              </a>
              {accommodation.siteName && (
                <p className="text-xs text-overlay1 mt-0.5">
                  {accommodation.siteName}
                </p>
              )}
              {accommodation.description && (
                <p className="text-sm text-subtext0 mt-1 line-clamp-2">
                  {accommodation.description}
                </p>
              )}
              {accommodation.comment && (
                <p className="text-sm text-subtext1 mt-2 italic">
                  &ldquo;{accommodation.comment}&rdquo;
                </p>
              )}
              <p className="text-xs text-overlay0 mt-2">
                Suggested by {accommodation.submitterName}
              </p>
            </div>
          </div>
        </div>

        {/* Delete button (for poll owner) */}
        {onDelete && (
          <button
            type="button"
            onClick={() => onDelete(accommodation.id)}
            disabled={isDeleting}
            className="text-overlay1 hover:text-red transition-colors disabled:opacity-50 self-start"
            aria-label="Delete accommodation"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
