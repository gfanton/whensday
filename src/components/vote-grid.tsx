"use client";

import type { ReactElement } from "react";
import type { Vote } from "@/db";

type VoteGridProps = {
  dates: string[];
  votes: Vote[];
};

type ResponseValue = "yes" | "maybe" | "no" | undefined;

export function VoteGrid({ dates, votes }: VoteGridProps): ReactElement {
  function formatDate(dateStr: string): { weekday: string; day: string } {
    const date = new Date(dateStr + "T00:00:00");
    return {
      weekday: date.toLocaleDateString("en-US", { weekday: "short" }),
      day: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    };
  }

  function getResponseStyle(response: ResponseValue): string {
    switch (response) {
      case "yes":
        return "bg-green-100 text-green-800";
      case "maybe":
        return "bg-yellow-100 text-yellow-800";
      case "no":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-400";
    }
  }

  function getResponseIcon(response: ResponseValue): string {
    switch (response) {
      case "yes":
        return "✓";
      case "maybe":
        return "?";
      case "no":
        return "✗";
      default:
        return "—";
    }
  }

  function countResponses(date: string): {
    yes: number;
    maybe: number;
    no: number;
  } {
    let yes = 0;
    let maybe = 0;
    let no = 0;
    for (const vote of votes) {
      const response = vote.responses[date];
      if (response === "yes") yes++;
      else if (response === "maybe") maybe++;
      else if (response === "no") no++;
    }
    return { yes, maybe, no };
  }

  if (votes.length === 0) {
    return (
      <p className="text-gray-500 text-center py-8">
        No votes yet. Be the first to vote!
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse">
        <thead>
          <tr>
            <th className="border-b border-gray-200 px-3 py-2 text-left text-sm font-medium text-gray-500">
              Participant
            </th>
            {dates.map((date) => {
              const formatted = formatDate(date);
              return (
                <th
                  key={date}
                  className="border-b border-gray-200 px-3 py-2 text-center text-sm font-medium text-gray-500"
                >
                  <div>{formatted.weekday}</div>
                  <div className="font-normal">{formatted.day}</div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {votes.map((vote) => (
            <tr key={vote.id}>
              <td className="border-b border-gray-100 px-3 py-2 text-sm font-medium text-gray-900">
                {vote.participantName}
              </td>
              {dates.map((date) => {
                const response = vote.responses[date];
                return (
                  <td
                    key={date}
                    className="border-b border-gray-100 px-3 py-2 text-center"
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
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-gray-50">
            <td className="border-t border-gray-200 px-3 py-2 text-sm font-medium text-gray-700">
              Summary
            </td>
            {dates.map((date) => {
              const counts = countResponses(date);
              return (
                <td
                  key={date}
                  className="border-t border-gray-200 px-3 py-2 text-center"
                >
                  <div className="flex justify-center gap-1 text-xs">
                    <span className="text-green-600">{counts.yes}</span>
                    <span className="text-gray-400">/</span>
                    <span className="text-yellow-600">{counts.maybe}</span>
                    <span className="text-gray-400">/</span>
                    <span className="text-red-600">{counts.no}</span>
                  </div>
                </td>
              );
            })}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
