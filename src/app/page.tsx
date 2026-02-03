"use client";

import type { ReactElement, FormEvent } from "react";
import { useState, useActionState, startTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createDoodle,
  deleteDoodle,
  type DeleteDoodleState,
} from "./actions";
import { CalendarPicker } from "@/components/calendar-picker";
import type { DatePattern } from "@/db/types";
import { useCreatedPolls, type CreatedPoll } from "@/hooks/use-created-polls";
import { hashOwnerKey } from "@/lib/crypto";

type PollSettings = {
  requireAllDates: boolean;
  allowMaybe: boolean;
  hideParticipants: boolean;
  hideScores: boolean;
};

export default function Home(): ReactElement {
  const router = useRouter();
  const { polls, isLoading: pollsLoading, addPoll, removePoll, getOwnerKey } = useCreatedPolls();

  const [createError, setCreateError] = useState<string | null>(null);
  const [deleteState, deleteAction, isDeleting] = useActionState<DeleteDoodleState, FormData>(
    deleteDoodle,
    null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
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
  const hasDateSelection = ((): boolean => {
    if (dates.length === 0) return false;
    const first = dates[0];
    if (first === undefined) return false;
    return Array.isArray(first) ? first.length > 0 : true;
  })();

  const isPending = isSubmitting;

  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setIsSubmitting(true);
    setCreateError(null);

    try {
      const form = e.currentTarget;
      const formData = new FormData(form);

      // 1. Generate owner key and hash
      const ownerKey = crypto.randomUUID();
      const ownerKeyHash = await hashOwnerKey(ownerKey);
      formData.append("ownerKeyHash", ownerKeyHash);

      // 2. Submit action (call server action directly)
      const result = await createDoodle(null, formData);

      // 3. Handle result
      if (result === null) {
        setCreateError("Unexpected error");
        return;
      }
      if (result.status === "error") {
        setCreateError(result.message);
        return;
      }

      // 4. Save to localStorage BEFORE navigating
      const title = formData.get("title");
      const poll: CreatedPoll = {
        id: result.pollId,
        ownerKey,
        title: typeof title === "string" ? title : "Untitled",
        createdAt: Date.now(),
      };
      addPoll(poll);
      router.push(`/${result.pollId}`);
    } catch (error) {
      setCreateError(
        error instanceof Error ? error.message : "An unexpected error occurred"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleDeletePoll(pollId: string): void {
    const ownerKey = getOwnerKey(pollId);
    if (ownerKey === undefined) return;

    const formData = new FormData();
    formData.append("doodleId", pollId);
    formData.append("ownerKey", ownerKey);

    // Optimistically remove from local state
    removePoll(pollId);

    // Then delete from server (must be in startTransition for useActionState)
    startTransition(() => {
      deleteAction(formData);
    });
  }

  return (
    <div className="min-h-screen bg-base">
      <main className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="mb-2 text-3xl font-bold text-text">Whensday</h1>
        <p className="mb-8 text-subtext0">
          Create a poll to find the best date for your group.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
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

          {createError !== null && (
            <p className="text-sm text-red">{createError}</p>
          )}

          <button
            type="submit"
            disabled={isPending || !hasDateSelection}
            className="w-full rounded-md bg-blue px-4 py-2 text-crust font-medium hover:bg-sapphire disabled:bg-surface1 disabled:text-overlay0 disabled:cursor-not-allowed transition-colors"
          >
            {isPending ? "Creating..." : "Create Poll"}
          </button>
        </form>

        {/* Your Previous Polls */}
        {!pollsLoading && polls.length > 0 && (
          <section className="mt-12">
            <h2 className="mb-4 text-xl font-semibold text-text">
              Your Previous Polls
            </h2>
            {deleteState?.status === "error" && (
              <p className="mb-4 text-sm text-red">{deleteState.message}</p>
            )}
            <ul className="space-y-2">
              {polls.map((poll) => (
                <li
                  key={poll.id}
                  className="flex items-center justify-between rounded-lg border border-surface1 bg-mantle px-4 py-3"
                >
                  <a
                    href={`/${poll.id}`}
                    className="text-blue hover:text-sapphire transition-colors truncate flex-1 mr-4"
                  >
                    {poll.title}
                  </a>
                  <button
                    type="button"
                    onClick={() => handleDeletePoll(poll.id)}
                    disabled={isDeleting}
                    className="text-sm text-overlay1 hover:text-red transition-colors disabled:opacity-50"
                    aria-label={`Delete poll: ${poll.title}`}
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
