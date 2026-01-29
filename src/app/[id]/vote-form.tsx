"use client";

import type { ReactElement } from "react";
import { useActionState, useState } from "react";
import { castVote, type ActionState } from "../actions";

type VoteFormProps = {
  doodleId: string;
  dates: string[];
};

type ResponseValue = "yes" | "maybe" | "no";

export function VoteForm({ doodleId, dates }: VoteFormProps): ReactElement {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    castVote,
    null
  );
  const [responses, setResponses] = useState<Record<string, ResponseValue>>({});

  function formatDate(dateStr: string): { weekday: string; day: string } {
    const date = new Date(dateStr + "T00:00:00");
    return {
      weekday: date.toLocaleDateString("en-US", { weekday: "short" }),
      day: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    };
  }

  function cycleResponse(date: string): void {
    const current = responses[date];
    const next: ResponseValue =
      current === undefined
        ? "yes"
        : current === "yes"
          ? "maybe"
          : current === "maybe"
            ? "no"
            : "yes";
    setResponses({ ...responses, [date]: next });
  }

  function getButtonStyle(response: ResponseValue | undefined): string {
    switch (response) {
      case "yes":
        return "bg-green-500 text-white hover:bg-green-600";
      case "maybe":
        return "bg-yellow-500 text-white hover:bg-yellow-600";
      case "no":
        return "bg-red-500 text-white hover:bg-red-600";
      default:
        return "bg-gray-200 text-gray-600 hover:bg-gray-300";
    }
  }

  function getButtonLabel(response: ResponseValue | undefined): string {
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

  const allDatesAnswered = dates.every((date) => responses[date] !== undefined);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="doodleId" value={doodleId} />
      <input type="hidden" name="responses" value={JSON.stringify(responses)} />

      <div>
        <label
          htmlFor="participantName"
          className="block text-sm font-medium text-gray-700"
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
          className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Your Availability
        </label>
        <p className="text-xs text-gray-500 mb-3">
          Click each date to cycle through: Yes → Maybe → No
        </p>
        <div className="flex flex-wrap gap-2">
          {dates.map((date) => {
            const formatted = formatDate(date);
            const response = responses[date];
            return (
              <button
                key={date}
                type="button"
                onClick={() => cycleResponse(date)}
                className={`flex flex-col items-center rounded-lg px-4 py-2 text-sm transition-colors ${getButtonStyle(response)}`}
              >
                <span className="font-medium">{formatted.weekday}</span>
                <span className="text-xs opacity-80">{formatted.day}</span>
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
          className={`text-sm ${state.status === "success" ? "text-green-600" : "text-red-600"}`}
        >
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending || !allDatesAnswered}
        className="w-full rounded-md bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {isPending ? "Submitting..." : "Submit Vote"}
      </button>

      {!allDatesAnswered && (
        <p className="text-xs text-gray-500 text-center">
          Please respond to all dates before submitting.
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
      className="mt-4 inline-flex items-center gap-2 rounded-md bg-gray-100 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-200"
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
