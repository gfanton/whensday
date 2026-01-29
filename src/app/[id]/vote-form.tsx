"use client";

import type { ReactElement } from "react";
import { useActionState, useState, useEffect } from "react";
import { castVote, type ActionState } from "../actions";
import { isGroupedDates, type DoodleDates, type DatePattern } from "@/db/types";
import { getGroupLabel, formatGroupRange } from "@/lib/date-groups";

// Serializable subset of Doodle for client components
type DoodleData = {
  id: string;
  dates: DoodleDates;
  pattern?: DatePattern | null;
  allowMaybe: boolean;
  requireAllDates: boolean;
};

type VoteFormProps = {
  doodle: DoodleData;
  initialName?: string;
  initialResponses?: Record<string, "yes" | "maybe" | "no" | undefined>;
  participantId?: string;
  onSuccess?: (participantId: string) => void;
};

type ResponseValue = "yes" | "maybe" | "no" | undefined;

// Voting option: either a single date or a group
type VotingOption = {
  key: string; // Response key: date string for flat, group index for grouped
  label: string; // Primary label
  sublabel?: string; // Secondary label (date range for groups)
};

export function VoteForm({
  doodle,
  initialName = "",
  initialResponses = {},
  participantId,
  onSuccess,
}: VoteFormProps): ReactElement {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    castVote,
    null
  );
  const [responses, setResponses] = useState<Record<string, ResponseValue>>(
    initialResponses
  );
  const [name, setName] = useState(initialName);

  // Notify parent on successful vote
  useEffect(() => {
    if (state?.status === "success" && state.participantId && onSuccess) {
      onSuccess(state.participantId);
    }
  }, [state, onSuccess]);

  const { dates, pattern, allowMaybe, requireAllDates } = doodle;

  // Determine if we're in grouped mode
  const isGrouped = isGroupedDates(dates);

  // Build voting options
  const votingOptions: VotingOption[] = isGrouped
    ? dates.map((group, index) => ({
        key: String(index),
        label: getGroupLabel(pattern ?? { type: "week" }, index + 1),
        sublabel: formatGroupRange(group),
      }))
    : (dates as string[]).map((date) => {
        const d = new Date(date + "T00:00:00");
        return {
          key: date,
          label: d.toLocaleDateString("en-US", { weekday: "short" }),
          sublabel: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        };
      });

  function cycleResponse(key: string): void {
    const current = responses[key];
    let next: ResponseValue;

    if (allowMaybe) {
      // 4-state cycle: undefined → yes → maybe → no → undefined
      next =
        current === undefined
          ? "yes"
          : current === "yes"
            ? "maybe"
            : current === "maybe"
              ? "no"
              : undefined;
    } else {
      // 3-state cycle: undefined → yes → no → undefined
      next =
        current === undefined
          ? "yes"
          : current === "yes"
            ? "no"
            : undefined;
    }

    setResponses({ ...responses, [key]: next });
  }

  function getButtonStyle(response: ResponseValue): string {
    switch (response) {
      case "yes":
        return "bg-green text-crust hover:bg-teal";
      case "maybe":
        return "bg-yellow text-crust hover:bg-peach";
      case "no":
        return "bg-red text-crust hover:bg-maroon";
      default:
        return "bg-surface0 text-subtext0 hover:bg-surface1";
    }
  }

  function getButtonLabel(response: ResponseValue): string {
    switch (response) {
      case "yes":
        return "Yes";
      case "maybe":
        return "Maybe";
      case "no":
        return "No";
      default:
        return "—";
    }
  }

  const answeredOptions = votingOptions.filter(
    (opt) => responses[opt.key] !== undefined
  );
  const allOptionsAnswered = answeredOptions.length === votingOptions.length;
  const canSubmit = requireAllDates
    ? allOptionsAnswered
    : answeredOptions.length > 0;
  const isEditing = Boolean(participantId);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="doodleId" value={doodle.id} />
      <input type="hidden" name="responses" value={JSON.stringify(responses)} />
      {participantId && (
        <input type="hidden" name="participantId" value={participantId} />
      )}

      <div>
        <label
          htmlFor="participantName"
          className="block text-sm font-medium text-subtext1"
        >
          Your Name
        </label>
        <input
          type="text"
          id="participantName"
          name="participantName"
          required
          maxLength={100}
          placeholder="John Doe"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 block w-full rounded-md border border-surface1 bg-surface0 px-3 py-2 text-text placeholder:text-overlay0 shadow-sm focus:border-blue focus:outline-none focus:ring-1 focus:ring-blue"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-subtext1 mb-2">
          Your Availability
        </label>
        <p className="text-xs text-overlay1 mb-3">
          Click each {isGrouped ? "period" : "date"} to cycle through:{" "}
          {allowMaybe ? "Not Set → Yes → Maybe → No" : "Not Set → Yes → No"}
        </p>
        <div className="flex flex-wrap gap-2">
          {votingOptions.map((option, index) => {
            const response = responses[option.key];
            return (
              <button
                key={option.key}
                type="button"
                onClick={() => cycleResponse(option.key)}
                className={`flex flex-col items-center rounded-lg px-4 py-2 text-sm transition-colors ${getButtonStyle(response)} ${
                  isGrouped && response === undefined
                    ? index % 2 === 0
                      ? "ring-1 ring-blue/30"
                      : "ring-1 ring-sapphire/30"
                    : ""
                }`}
              >
                <span className="font-medium">{option.label}</span>
                {option.sublabel && (
                  <span className="text-xs opacity-80">{option.sublabel}</span>
                )}
                <span className="mt-1 text-xs font-semibold">
                  {getButtonLabel(response)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {state && (
        <p
          className={`text-sm ${state.status === "success" ? "text-green" : "text-red"}`}
        >
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending || !canSubmit || !name.trim()}
        className="w-full rounded-md bg-blue px-4 py-2 text-crust font-medium hover:bg-sapphire disabled:bg-surface1 disabled:text-overlay0 disabled:cursor-not-allowed transition-colors"
      >
        {isPending
          ? "Submitting..."
          : isEditing
            ? "Update Vote"
            : "Submit Vote"}
      </button>

      {!canSubmit && (
        <p className="text-xs text-overlay1 text-center">
          {requireAllDates
            ? `Please respond to all ${isGrouped ? "periods" : "dates"} before submitting.`
            : `Please respond to at least one ${isGrouped ? "period" : "date"} before submitting.`}
        </p>
      )}
    </form>
  );
}

export function ShareButton(): ReactElement {
  const [copied, setCopied] = useState(false);

  function handleCopy(): void {
    navigator.clipboard
      .writeText(window.location.href)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch((error: unknown) => {
        console.error("Failed to copy to clipboard:", error);
      });
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="mt-4 inline-flex items-center gap-2 rounded-md bg-surface0 px-3 py-1.5 text-sm text-subtext1 hover:bg-surface1 transition-colors"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
        />
      </svg>
      {copied ? "Copied!" : "Copy Link"}
    </button>
  );
}
