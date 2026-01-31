"use client";

import type { ReactElement } from "react";
import { useMemo } from "react";
import { DayPicker } from "react-day-picker";
import { format, isToday, min, max } from "date-fns";
import "react-day-picker/style.css";
import { isGroupedDates, type DoodleDates, type DatePattern } from "@/db/types";

type ResponseValue = "yes" | "maybe" | "no" | undefined;

type VoteData = {
  id: string;
  participantName: string;
  responses: Record<string, ResponseValue>;
};

type VoteCalendarProps = {
  dates: DoodleDates;
  pattern?: DatePattern | null;
  votes: VoteData[];
  currentUserResponses?: Record<string, ResponseValue>;
};

type CalendarModifiers = {
  evenGroup?: Date[];
  oddGroup?: Date[];
  userSelected?: Date[];
  highVotes?: Date[];
  mediumVotes?: Date[];
  lowVotes?: Date[];
  today?: (date: Date) => boolean;
};

// ---- Static Class Names (no dependencies, defined outside component)

const modifiersClassNames = {
  evenGroup: "bg-blue/50",
  oddGroup: "bg-sapphire/50",
  highVotes: "!bg-green/70 [&>button]:font-semibold",
  mediumVotes: "!bg-yellow/50",
  lowVotes: "opacity-50",
  userSelected: "ring-3 ring-peach ring-inset [&>button]:font-bold",
  today: "[&>button]:text-peach [&>button]:font-bold",
} as const;

const dayPickerClassNames = {
  root: "w-full relative",
  months: "flex w-full",
  month: "flex flex-col w-full gap-4",
  month_caption: "flex justify-center items-center h-12",
  caption_label: "text-base font-semibold text-text",
  nav: "absolute inset-x-0 top-0 flex justify-between items-center h-12 px-2",
  button_previous: "p-2 rounded-md hover:bg-surface1 transition-colors",
  button_next: "p-2 rounded-md hover:bg-surface1 transition-colors",
  chevron: "fill-lavender",
  month_grid: "w-full border-collapse table-fixed",
  weekdays: "flex w-full",
  weekday: "flex-1 text-center text-sm font-medium text-overlay1 py-3",
  week: "flex w-full",
  day: "flex-1 relative p-1 text-center text-base aspect-square flex items-center justify-center",
  day_button:
    "w-full h-full flex items-center justify-center rounded-lg text-text font-medium cursor-default focus:outline-none disabled:text-surface2 disabled:font-normal",
  selected: "",
  today: "[&>button]:text-peach [&>button]:font-bold",
  disabled: "[&>button]:text-surface2 [&>button]:font-normal",
} as const;

export function VoteCalendar({
  dates,
  pattern: _pattern,
  votes,
  currentUserResponses,
}: VoteCalendarProps): ReactElement {
  const isGrouped = isGroupedDates(dates);
  const totalVotes = votes.length;

  // Calculate the date range to display
  const dateRange = useMemo(() => {
    const allDates: Date[] = [];

    if (isGrouped) {
      for (const group of dates) {
        for (const d of group) {
          allDates.push(new Date(d + "T00:00:00"));
        }
      }
    } else {
      for (const d of dates) {
        allDates.push(new Date(d + "T00:00:00"));
      }
    }

    if (allDates.length === 0) {
      return { from: new Date(), to: new Date() };
    }

    return {
      from: min(allDates),
      to: max(allDates),
    };
  }, [dates, isGrouped]);

  // Calculate vote counts per date/group
  const voteCounts = useMemo(() => {
    const counts: Record<string, { yes: number; maybe: number; no: number }> = {};

    if (isGrouped) {
      // For grouped dates, count votes per group index
      for (let i = 0; i < dates.length; i++) {
        const key = String(i);
        counts[key] = { yes: 0, maybe: 0, no: 0 };
        for (const vote of votes) {
          const response = vote.responses[key];
          if (response === "yes") counts[key]!.yes++;
          else if (response === "maybe") counts[key]!.maybe++;
          else if (response === "no") counts[key]!.no++;
        }
      }
    } else {
      // For flat dates, count per date
      for (const date of dates) {
        counts[date] = { yes: 0, maybe: 0, no: 0 };
        for (const vote of votes) {
          const response = vote.responses[date];
          if (response === "yes") counts[date]!.yes++;
          else if (response === "maybe") counts[date]!.maybe++;
          else if (response === "no") counts[date]!.no++;
        }
      }
    }

    return counts;
  }, [dates, votes, isGrouped]);

  // Build modifiers for the calendar
  const modifiers = useMemo((): CalendarModifiers => {
    const evenGroup: Date[] = [];
    const oddGroup: Date[] = [];
    const userSelected: Date[] = [];
    const highVotes: Date[] = [];
    const mediumVotes: Date[] = [];
    const lowVotes: Date[] = [];

    function getVoteLevel(yesCount: number): "high" | "medium" | "low" {
      if (totalVotes === 0) return "low";
      const ratio = yesCount / totalVotes;
      if (ratio >= 0.7) return "high";
      if (ratio >= 0.4) return "medium";
      return "low";
    }

    if (isGrouped) {
      // Process each group
      for (let i = 0; i < dates.length; i++) {
        const group = dates[i];
        if (!group) continue;

        const groupDates = group.map((d) => new Date(d + "T00:00:00"));
        const key = String(i);
        const count = voteCounts[key];
        const voteLevel = count ? getVoteLevel(count.yes) : "low";

        // Alternating colors for groups
        if (i % 2 === 0) {
          evenGroup.push(...groupDates);
        } else {
          oddGroup.push(...groupDates);
        }

        // Vote intensity
        if (voteLevel === "high") {
          highVotes.push(...groupDates);
        } else if (voteLevel === "medium") {
          mediumVotes.push(...groupDates);
        } else {
          lowVotes.push(...groupDates);
        }

        // User's own selections
        if (currentUserResponses?.[key] === "yes") {
          userSelected.push(...groupDates);
        }
      }
    } else {
      // Process each date
      for (const dateStr of dates as string[]) {
        const date = new Date(dateStr + "T00:00:00");
        const count = voteCounts[dateStr];
        const voteLevel = count ? getVoteLevel(count.yes) : "low";

        // All dates are in even group for flat mode
        evenGroup.push(date);

        // Vote intensity
        if (voteLevel === "high") {
          highVotes.push(date);
        } else if (voteLevel === "medium") {
          mediumVotes.push(date);
        } else {
          lowVotes.push(date);
        }

        // User's own selections
        if (currentUserResponses?.[dateStr] === "yes") {
          userSelected.push(date);
        }
      }
    }

    return {
      evenGroup,
      oddGroup,
      userSelected,
      highVotes,
      mediumVotes,
      lowVotes,
      today: (date: Date) => isToday(date),
    };
  }, [dates, voteCounts, currentUserResponses, isGrouped, totalVotes]);

  // Get all valid dates to show as disabled (non-selectable but visible)
  const validDatesSet = useMemo(() => {
    const set = new Set<string>();
    if (isGrouped) {
      for (const group of dates) {
        for (const d of group) {
          set.add(d);
        }
      }
    } else {
      for (const d of dates) {
        set.add(d);
      }
    }
    return set;
  }, [dates, isGrouped]);

  // Matcher function to disable dates NOT in our options
  const disabledMatcher = useMemo(() => {
    return (date: Date) => {
      const dateStr = format(date, "yyyy-MM-dd");
      return !validDatesSet.has(dateStr);
    };
  }, [validDatesSet]);

  // Always show single month - user can navigate
  const numberOfMonths = 1;

  return (
    <div className="vote-calendar space-y-4">
      <h2 className="text-lg font-semibold text-text">Calendar Overview</h2>
      <DayPicker
        mode="single"
        defaultMonth={dateRange.from}
        numberOfMonths={numberOfMonths}
        weekStartsOn={1}
        disabled={disabledMatcher}
        modifiers={modifiers}
        modifiersClassNames={modifiersClassNames}
        classNames={dayPickerClassNames}
      />

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-6 text-sm text-subtext1 pt-2">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded bg-green/70" />
          <span>High yes votes</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded bg-yellow/50" />
          <span>Some yes votes</span>
        </div>
        {currentUserResponses && (
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded bg-surface1 ring-3 ring-peach ring-inset" />
            <span>Your selection</span>
          </div>
        )}
      </div>
    </div>
  );
}
