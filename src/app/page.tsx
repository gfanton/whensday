"use client";

import type { ReactElement, FormEvent } from "react";
import { useState, useActionState, startTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  createDoodle,
  deleteDoodle,
  type DeleteDoodleState,
} from "./actions";
import { CalendarPicker } from "@/components/calendar-picker";
import type { DatePattern } from "@/db/types";
import { useCreatedPolls, type CreatedPoll } from "@/hooks/use-created-polls";
import { hashOwnerKey } from "@/lib/crypto";

// UX barrier, not real security - localStorage can be cleared by users
const MAX_POLLS_PER_USER = 5;

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
  const hasReachedPollLimit = polls.length >= MAX_POLLS_PER_USER;

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
        <div className="text-center mb-8">
          <Image
            src="/title-1024.png"
            alt="Whensday"
            width={816}
            height={201}
            priority
            className="h-16 sm:h-20 w-auto mx-auto mb-2"
          />
          <p className="text-subtext0">
            Create a poll to find the best date for your group.
          </p>
        </div>

        {/* Poll limit reached */}
        {!pollsLoading && hasReachedPollLimit && (
          <div className="mb-8 rounded-lg border border-yellow/30 bg-yellow/10 p-6">
            <div className="flex items-start gap-3">
              <svg
                className="w-6 h-6 text-yellow flex-shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <div>
                <h2 className="text-lg font-semibold text-text">
                  Poll limit reached
                </h2>
                <p className="mt-1 text-sm text-subtext1">
                  You&apos;ve reached the maximum of {MAX_POLLS_PER_USER} polls.
                  Delete an existing poll below to create a new one.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Create form - only show when under limit */}
        {!hasReachedPollLimit && (
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
        )}

        {/* Your Previous Polls */}
        {!pollsLoading && polls.length > 0 && (
          <section className={hasReachedPollLimit ? "" : "mt-12"}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-text">
                Your Polls
              </h2>
              <span className="text-sm text-overlay1">
                {polls.length} / {MAX_POLLS_PER_USER}
              </span>
            </div>
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
