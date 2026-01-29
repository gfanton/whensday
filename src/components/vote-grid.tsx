"use client";

import type { ReactElement } from "react";
import { isGroupedDates, type DoodleDates, type DatePattern } from "@/db/types";
import { getGroupLabel, formatGroupRange } from "@/lib/date-groups";

// Serializable vote data for display
type VoteData = {
  id: string;
  participantName: string;
  responses: Record<string, "yes" | "maybe" | "no" | undefined>;
};

type VoteGridProps = {
  dates: DoodleDates;
  pattern?: DatePattern | null;
  votes: VoteData[];
  hideParticipants?: boolean;
  hideScores?: boolean;
  currentUserVoted?: boolean;
};

type ResponseValue = "yes" | "maybe" | "no" | undefined;

// Column data for rendering
type ColumnData = {
  key: string; // Response key: date string for flat, group index for grouped
  header: string; // Primary header text
  subheader?: string; // Secondary header text (date range for groups)
};

export function VoteGrid({
  dates,
  pattern,
  votes,
  hideParticipants = false,
  hideScores = false,
  currentUserVoted = false,
}: VoteGridProps): ReactElement {
  // Determine if we're in grouped mode
  const isGrouped = isGroupedDates(dates);

  // Build column data
  const columns: ColumnData[] = isGrouped
    ? dates.map((group, index) => ({
        key: String(index),
        header: getGroupLabel(pattern ?? { type: "weekday-range", startDay: 1, endDay: 0 }, index + 1),
        subheader: formatGroupRange(group),
      }))
    : (dates as string[]).map((date) => {
        const d = new Date(date + "T00:00:00");
        return {
          key: date,
          header: d.toLocaleDateString("en-US", { weekday: "short" }),
          subheader: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        };
      });

  function getResponseStyle(response: ResponseValue): string {
    switch (response) {
      case "yes":
        return "bg-green/20 text-green";
      case "maybe":
        return "bg-yellow/20 text-yellow";
      case "no":
        return "bg-red/20 text-red";
      default:
        return "bg-surface0 text-overlay0";
    }
  }

  function getResponseIcon(response: ResponseValue): string {
    switch (response) {
      case "yes":
        return "\u2713";
      case "maybe":
        return "?";
      case "no":
        return "\u2717";
      default:
        return "\u2014";
    }
  }

  function countResponses(columnKey: string): {
    yes: number;
    maybe: number;
    no: number;
  } {
    let yes = 0;
    let maybe = 0;
    let no = 0;
    for (const vote of votes) {
      const response = vote.responses[columnKey];
      if (response === "yes") yes++;
      else if (response === "maybe") maybe++;
      else if (response === "no") no++;
    }
    return { yes, maybe, no };
  }

  if (votes.length === 0) {
    return (
      <p className="text-overlay1 text-center py-8">
        No votes yet. Be the first to vote!
      </p>
    );
  }

  // Check if content should be hidden
  const shouldHideParticipants = hideParticipants && !currentUserVoted;
  const shouldHideScores = hideScores && !currentUserVoted;

  if (shouldHideParticipants && shouldHideScores) {
    return (
      <div className="text-center py-8 space-y-2">
        <p className="text-overlay1">
          {votes.length} {votes.length === 1 ? "person has" : "people have"} voted.
        </p>
        <p className="text-sm text-overlay0">
          Vote to see who else has responded.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse">
        <thead>
          <tr>
            <th className="border-b border-surface1 px-3 py-2 text-left text-sm font-medium text-overlay1">
              Participant
            </th>
            {columns.map((col, index) => (
              <th
                key={col.key}
                className={`border-b border-surface1 px-3 py-2 text-center text-sm font-medium text-overlay1 ${
                  isGrouped
                    ? index % 2 === 0
                      ? "bg-blue/10"
                      : "bg-sapphire/10"
                    : ""
                }`}
              >
                <div>{col.header}</div>
                {col.subheader && (
                  <div className="font-normal text-xs">{col.subheader}</div>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {shouldHideParticipants ? (
            <tr>
              <td
                colSpan={columns.length + 1}
                className="border-b border-surface0 px-3 py-4 text-center text-sm text-overlay1"
              >
                <p>
                  {votes.length} {votes.length === 1 ? "person has" : "people have"} voted.
                </p>
                <p className="text-xs text-overlay0 mt-1">
                  Vote to see individual responses.
                </p>
              </td>
            </tr>
          ) : (
            votes.map((vote) => (
              <tr key={vote.id}>
                <td className="border-b border-surface0 px-3 py-2 text-sm font-medium text-text">
                  {vote.participantName}
                </td>
                {columns.map((col, index) => {
                  const response = vote.responses[col.key];
                  return (
                    <td
                      key={col.key}
                      className={`border-b border-surface0 px-3 py-2 text-center ${
                        isGrouped
                          ? index % 2 === 0
                            ? "bg-blue/5"
                            : "bg-sapphire/5"
                          : ""
                      }`}
                    >
                      <span
                        className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${getResponseStyle(response)}`}
                      >
                        {getResponseIcon(response)}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
        {!shouldHideScores && (
          <tfoot>
            <tr className="bg-surface0/50">
              <td className="border-t border-surface1 px-3 py-2 text-sm font-medium text-subtext1">
                Summary
              </td>
              {columns.map((col, index) => {
                const counts = countResponses(col.key);
                return (
                  <td
                    key={col.key}
                    className={`border-t border-surface1 px-3 py-2 text-center ${
                      isGrouped
                        ? index % 2 === 0
                          ? "bg-blue/5"
                          : "bg-sapphire/5"
                        : ""
                    }`}
                  >
                    <div className="flex justify-center gap-1 text-xs">
                      <span className="text-green">{counts.yes}</span>
                      <span className="text-overlay0">/</span>
                      <span className="text-yellow">{counts.maybe}</span>
                      <span className="text-overlay0">/</span>
                      <span className="text-red">{counts.no}</span>
                    </div>
                  </td>
                );
              })}
            </tr>
          </tfoot>
        )}
      </table>
      {shouldHideScores && !shouldHideParticipants && (
        <p className="text-sm text-overlay0 text-center mt-4">
          Vote to see the summary.
        </p>
      )}
    </div>
  );
}
