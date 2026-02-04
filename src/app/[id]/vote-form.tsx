"use client";

import type { ReactElement } from "react";
import { useActionState, useState, useEffect, useMemo, useCallback } from "react";
import { castVote, type ActionState } from "../actions";
import { isGroupedDates, type DoodleDates, type DatePattern } from "@/db/types";
import { getGroupLabel, formatGroupRange } from "@/lib/date-groups";
import { format, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";

const DATES_EXPANDED_KEY = "whensday:dates-expanded";

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
  onChangeIdentity?: () => void;
  initialExpanded?: boolean;
};

type ResponseValue = "yes" | "maybe" | "no" | undefined;

function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${JSON.stringify(value)}`);
}

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
  onChangeIdentity,
  initialExpanded,
}: VoteFormProps): ReactElement {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    castVote,
    null
  );
  const [responses, setResponses] = useState<Record<string, ResponseValue>>(
    initialResponses
  );
  const [name, setName] = useState(initialName);
  const [datesExpanded, setDatesExpanded] = useState(() => {
    // Use prop if explicitly provided
    if (initialExpanded !== undefined) return initialExpanded;
    // Otherwise check localStorage
    if (typeof window === "undefined") return true;
    const stored = localStorage.getItem(DATES_EXPANDED_KEY);
    return stored === null ? true : stored === "true";
  });

  const toggleDatesExpanded = useCallback(() => {
    setDatesExpanded((prev) => {
      const next = !prev;
      localStorage.setItem(DATES_EXPANDED_KEY, String(next));
      return next;
    });
  }, []);

  // Notify parent on successful vote and auto-collapse
  useEffect(() => {
    if (state?.status === "success") {
      // Auto-collapse dates after successful vote
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional: one-time side effect on success
      setDatesExpanded(false);
      localStorage.setItem(DATES_EXPANDED_KEY, "false");

      if (state.participantId !== undefined && onSuccess !== undefined) {
        onSuccess(state.participantId);
      }
    }
  }, [state, onSuccess]);

  const { dates, pattern, allowMaybe, requireAllDates } = doodle;

  // Determine if we're in grouped mode
  const isGrouped = isGroupedDates(dates);

  // Build voting options
  const votingOptions: VotingOption[] = isGrouped
    ? dates.map((group, index) => ({
        key: String(index),
        label: getGroupLabel(pattern ?? { type: "weekday-range", startDay: 1, endDay: 0 }, index + 1),
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

  // For flexible mode: organize dates into week-aligned grid
  const weekGrid = useMemo(() => {
    if (isGrouped) return null;

    const flatDates = dates as string[];
    if (flatDates.length === 0) return null;

    // Create a set of selected dates for quick lookup
    const dateSet = new Set(flatDates);

    // Find the range of weeks we need to display
    const parsedDates = flatDates.map((d) => new Date(d + "T00:00:00"));
    const firstDate = parsedDates[0];
    const lastDate = parsedDates[parsedDates.length - 1];
    if (!firstDate || !lastDate) return null;

    // Get week boundaries (Monday = 1 as start of week)
    const firstWeekStart = startOfWeek(firstDate, { weekStartsOn: 1 });
    const lastWeekEnd = endOfWeek(lastDate, { weekStartsOn: 1 });

    // Generate all days in the range
    const allDays = eachDayOfInterval({ start: firstWeekStart, end: lastWeekEnd });

    // Group by weeks (7 days each)
    const weeks: { date: Date; isOption: boolean }[][] = [];
    let currentWeek: { date: Date; isOption: boolean }[] = [];

    for (const day of allDays) {
      const dateStr = format(day, "yyyy-MM-dd");
      currentWeek.push({
        date: day,
        isOption: dateSet.has(dateStr),
      });

      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }

    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }

    return weeks;
  }, [dates, isGrouped]);

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
      case undefined:
        return "bg-surface0 text-subtext0 hover:bg-surface1";
      default:
        return assertNever(response);
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
      case undefined:
        return "—";
      default:
        return assertNever(response);
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

  // Response summary for collapsed view
  const responseSummary = useMemo(() => {
    const yes = Object.values(responses).filter((r) => r === "yes").length;
    const maybe = Object.values(responses).filter((r) => r === "maybe").length;
    const no = Object.values(responses).filter((r) => r === "no").length;
    return { yes, maybe, no, total: yes + maybe + no };
  }, [responses]);

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
        <div className="mt-1 flex gap-2">
          <input
            type="text"
            id="participantName"
            name="participantName"
            required
            maxLength={100}
            placeholder="John Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 rounded-md border border-surface1 bg-surface0 px-3 py-2 text-text placeholder:text-overlay0 shadow-sm focus:border-blue focus:outline-none focus:ring-1 focus:ring-blue"
          />
          {onChangeIdentity && (
            <button
              type="button"
              onClick={onChangeIdentity}
              title="Switch identity"
              className="flex items-center justify-center w-10 h-10 rounded-full bg-surface0 border border-surface1 text-overlay1 hover:bg-blue/20 hover:text-blue hover:border-blue transition-all active:scale-95"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div>
        {/* Collapsible header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-subtext1">
              Your Availability
            </label>
            <span className="text-xs text-overlay0 bg-surface0 px-2 py-0.5 rounded-full">
              {votingOptions.length} {isGrouped ? "periods" : "dates"}
            </span>
          </div>
          {datesExpanded && (
            <button
              type="button"
              onClick={toggleDatesExpanded}
              className="flex items-center gap-1.5 text-xs text-overlay1 hover:text-subtext1 transition-colors px-2 py-1 rounded hover:bg-surface0"
            >
              <span>Hide</span>
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </button>
          )}
        </div>

        {/* Collapsed summary */}
        {!datesExpanded && responseSummary.total > 0 && (
          <div className="flex items-center gap-3 py-2 text-sm">
            <span className="text-overlay1">Your responses:</span>
            {responseSummary.yes > 0 && (
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-green" />
                <span className="text-green font-medium">{responseSummary.yes}</span>
              </span>
            )}
            {responseSummary.maybe > 0 && (
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-yellow" />
                <span className="text-yellow font-medium">{responseSummary.maybe}</span>
              </span>
            )}
            {responseSummary.no > 0 && (
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-red" />
                <span className="text-red font-medium">{responseSummary.no}</span>
              </span>
            )}
          </div>
        )}

        {/* Collapsible content */}
        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            datesExpanded ? "max-h-[3000px] opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <p className="text-xs text-overlay1 mb-3">
            Click each {isGrouped ? "period" : "date"} to cycle through:{" "}
            {allowMaybe ? "Not Set → Yes → Maybe → No" : "Not Set → Yes → No"}
          </p>

          {/* Grouped mode: flex wrap */}
          {isGrouped && (
          <div className="flex flex-wrap gap-2">
            {votingOptions.map((option, index) => {
              const response = responses[option.key];
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => cycleResponse(option.key)}
                  className={`flex flex-col items-center rounded-lg px-4 py-2 text-sm transition-colors ${getButtonStyle(response)} ${
                    response === undefined
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
        )}

        {/* Flexible mode: week-aligned grid */}
        {!isGrouped && weekGrid && (
          <div className="space-y-1">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                <div
                  key={day}
                  className="text-center text-xs font-semibold text-overlay1 uppercase tracking-wide py-1"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Week rows */}
            {weekGrid.map((week, weekIndex) => (
              <div key={weekIndex} className="grid grid-cols-7 gap-1">
                {week.map((day) => {
                  const dateStr = format(day.date, "yyyy-MM-dd");

                  if (!day.isOption) {
                    // Empty cell for non-option days
                    return <div key={dateStr} className="aspect-square" />;
                  }

                  const response = responses[dateStr];
                  return (
                    <button
                      key={dateStr}
                      type="button"
                      onClick={() => cycleResponse(dateStr)}
                      className={`flex flex-col items-center justify-center rounded-lg aspect-square text-sm transition-colors ${getButtonStyle(response)}`}
                    >
                      <span className="font-medium">
                        {format(day.date, "d")}
                      </span>
                      <span className="text-[10px] opacity-80">
                        {format(day.date, "MMM")}
                      </span>
                      <span className="text-[10px] font-semibold">
                        {getButtonLabel(response)}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}
        </div>
      </div>

      {state && (
        <p
          className={`text-sm ${state.status === "success" ? "text-green" : "text-red"}`}
        >
          {state.message}
        </p>
      )}

      {/* Show dates button when collapsed */}
      {!datesExpanded && (
        <button
          type="button"
          onClick={toggleDatesExpanded}
          className="w-full rounded-md bg-surface0 border border-surface1 px-4 py-3 text-subtext1 font-medium hover:bg-surface1 hover:text-text transition-colors flex items-center justify-center gap-2"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>Show dates to vote</span>
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      )}

      {/* Submit button when expanded */}
      {datesExpanded && (
        <>
          <button
            type="submit"
            disabled={isPending || !canSubmit || !name.trim()}
            className="w-full rounded-md bg-blue px-4 py-3 text-crust font-medium hover:bg-sapphire disabled:bg-surface1 disabled:text-overlay0 disabled:cursor-not-allowed transition-colors"
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
        </>
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
