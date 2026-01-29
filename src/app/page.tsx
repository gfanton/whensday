"use client";

import type { ReactElement } from "react";
import { useActionState, useState } from "react";
import { createDoodle, type ActionState } from "./actions";

export default function Home(): ReactElement {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    createDoodle,
    null
  );
  const [dates, setDates] = useState<string[]>([]);
  const [dateInput, setDateInput] = useState("");

  function addDate(): void {
    if (dateInput && !dates.includes(dateInput)) {
      setDates([...dates, dateInput].sort());
      setDateInput("");
    }
  }

  function removeDate(date: string): void {
    setDates(dates.filter((d) => d !== date));
  }

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="mx-auto max-w-xl px-4 py-12">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">Daadle</h1>
        <p className="mb-8 text-gray-600">
          Create a poll to find the best date for your group.
        </p>

        <form action={formAction} className="space-y-6">
          <div>
            <label
              htmlFor="title"
              className="block text-sm font-medium text-gray-700"
            >
              Title
            </label>
            <input
              type="text"
              id="title"
              name="title"
              required
              maxLength={200}
              placeholder="Holiday party 2025"
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-gray-700"
            >
              Description (optional)
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              maxLength={1000}
              placeholder="Let's find a date that works for everyone!"
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Dates
            </label>
            <div className="mt-1 flex gap-2">
              <input
                type="date"
                value={dateInput}
                onChange={(e) => setDateInput(e.target.value)}
                className="block flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={addDate}
                className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
              >
                Add
              </button>
            </div>

            {dates.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {dates.map((date) => (
                  <span
                    key={date}
                    className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800"
                  >
                    {formatDate(date)}
                    <button
                      type="button"
                      onClick={() => removeDate(date)}
                      className="ml-1 text-blue-600 hover:text-blue-800"
                    >
                      &times;
                    </button>
                    <input type="hidden" name="dates" value={date} />
                  </span>
                ))}
              </div>
            )}

            {dates.length === 0 && (
              <p className="mt-2 text-sm text-gray-500">
                Add at least one date option.
              </p>
            )}
          </div>

          {state?.status === "error" && (
            <p className="text-sm text-red-600">{state.message}</p>
          )}

          <button
            type="submit"
            disabled={isPending || dates.length === 0}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isPending ? "Creating..." : "Create Poll"}
          </button>
        </form>
      </main>
    </div>
  );
}
