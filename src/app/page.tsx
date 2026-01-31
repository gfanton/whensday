"use client";

import type { ReactElement } from "react";
import { useActionState, useState } from "react";
import { createDoodle, type ActionState } from "./actions";
import { CalendarPicker } from "@/components/calendar-picker";
import type { DatePattern } from "@/db/types";

type PollSettings = {
  requireAllDates: boolean;
  allowMaybe: boolean;
  hideParticipants: boolean;
  hideScores: boolean;
};

export default function Home(): ReactElement {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    createDoodle,
    null
  );
  const [dates, setDates] = useState<string[] | string[][]>([]);
  const [pattern, setPattern] = useState<DatePattern>({ type: "flexible" });
  const [settings, setSettings] = useState<PollSettings>({
    requireAllDates: false,
    allowMaybe: true,
    hideParticipants: false,
    hideScores: false,
  });

  function handleDatesChange(
    newDates: string[] | string[][],
    newPattern: DatePattern
  ): void {
    setDates(newDates);
    setPattern(newPattern);
  }

  function toggleSetting(key: keyof PollSettings): void {
    setSettings({ ...settings, [key]: !settings[key] });
  }

  // Check if we have any dates selected
  const hasDateSelection =
    dates.length > 0 && (Array.isArray(dates[0]) ? dates[0].length > 0 : true);

  return (
    <div className="min-h-screen bg-base">
      <main className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="mb-2 text-3xl font-bold text-text">Whensday</h1>
        <p className="mb-8 text-subtext0">
          Create a poll to find the best date for your group.
        </p>

        <form action={formAction} className="space-y-6">
          <div>
            <label
              htmlFor="title"
              className="block text-sm font-medium text-subtext1"
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
              className="mt-1 block w-full rounded-md border border-surface1 bg-mantle px-3 py-2 text-text placeholder:text-overlay0 shadow-sm focus:border-blue focus:outline-none focus:ring-1 focus:ring-blue"
            />
          </div>

          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-subtext1"
            >
              Description (optional)
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              maxLength={1000}
              placeholder="Let's find a date that works for everyone!"
              className="mt-1 block w-full rounded-md border border-surface1 bg-mantle px-3 py-2 text-text placeholder:text-overlay0 shadow-sm focus:border-blue focus:outline-none focus:ring-1 focus:ring-blue"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-subtext1 mb-3">
              Select Dates
            </label>
            <CalendarPicker
              selectedDates={dates}
              onDatesChange={handleDatesChange}
            />
          </div>

          {/* Poll Settings */}
          <div>
            <label className="block text-sm font-medium text-subtext1 mb-3">
              Poll Settings
            </label>
            <div className="space-y-3 rounded-lg border border-surface1 bg-mantle p-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.requireAllDates}
                  onChange={() => toggleSetting("requireAllDates")}
                  className="h-4 w-4 rounded border-surface1 bg-surface0 text-blue focus:ring-blue focus:ring-offset-0"
                />
                <span className="text-sm text-text">
                  Require response to all{" "}
                  {pattern.type !== "flexible" ? "periods" : "dates"}
                </span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.allowMaybe}
                  onChange={() => toggleSetting("allowMaybe")}
                  className="h-4 w-4 rounded border-surface1 bg-surface0 text-blue focus:ring-blue focus:ring-offset-0"
                />
                <span className="text-sm text-text">
                  Allow &quot;Maybe&quot; responses
                </span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.hideParticipants}
                  onChange={() => toggleSetting("hideParticipants")}
                  className="h-4 w-4 rounded border-surface1 bg-surface0 text-blue focus:ring-blue focus:ring-offset-0"
                />
                <span className="text-sm text-text">
                  Hide votes until user has voted
                </span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.hideScores}
                  onChange={() => toggleSetting("hideScores")}
                  className="h-4 w-4 rounded border-surface1 bg-surface0 text-blue focus:ring-blue focus:ring-offset-0"
                />
                <span className="text-sm text-text">
                  Hide summary until user has voted
                </span>
              </label>
            </div>
          </div>

          {/* Hidden inputs for settings */}
          <input
            type="hidden"
            name="requireAllDates"
            value={settings.requireAllDates.toString()}
          />
          <input
            type="hidden"
            name="allowMaybe"
            value={settings.allowMaybe.toString()}
          />
          <input
            type="hidden"
            name="hideParticipants"
            value={settings.hideParticipants.toString()}
          />
          <input
            type="hidden"
            name="hideScores"
            value={settings.hideScores.toString()}
          />

          {state?.status === "error" && (
            <p className="text-sm text-red">{state.message}</p>
          )}

          <button
            type="submit"
            disabled={isPending || !hasDateSelection}
            className="w-full rounded-md bg-blue px-4 py-2 text-crust font-medium hover:bg-sapphire disabled:bg-surface1 disabled:text-overlay0 disabled:cursor-not-allowed transition-colors"
          >
            {isPending ? "Creating..." : "Create Poll"}
          </button>
        </form>
      </main>
    </div>
  );
}
