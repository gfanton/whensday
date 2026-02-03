"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { eq, count } from "drizzle-orm";
import { db, CreateDoodleSchema, CastVoteSchema } from "@/db";
import { doodles, votes } from "@/db/schema";
import { checkRateLimit } from "@/lib/rate-limit";

export type ActionState =
  | null
  | { status: "error"; message: string }
  | { status: "success"; message: string; participantId?: string };

async function getClientIp(): Promise<string> {
  const headersList = await headers();
  const forwarded = headersList.get("x-forwarded-for");
  if (forwarded !== null) {
    const parts = forwarded.split(",");
    const firstPart = parts[0]?.trim();
    if (firstPart !== undefined && firstPart !== "") {
      return firstPart;
    }
  }
  const realIp = headersList.get("x-real-ip");
  if (realIp !== null && realIp !== "") {
    return realIp;
  }
  return "unknown";
}

export async function createDoodle(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  // Rate limit: 10 polls per hour per IP
  const ip = await getClientIp();
  const { allowed, resetInSeconds } = checkRateLimit(ip, 10, 60 * 60 * 1000);

  if (!allowed) {
    const minutes = Math.ceil(resetInSeconds / 60);
    return {
      status: "error",
      message: `Rate limit exceeded. Try again in ${minutes} minute${minutes > 1 ? "s" : ""}.`,
    };
  }

  // Handle dates - can be flat array or JSON-encoded grouped array
  const datesRaw = formData.getAll("dates");
  let dates: unknown;

  // If single value that looks like JSON array, parse it
  if (datesRaw.length === 1 && typeof datesRaw[0] === "string") {
    const first = datesRaw[0];
    if (first.startsWith("[")) {
      try {
        dates = JSON.parse(first);
      } catch {
        dates = datesRaw.filter((d): d is string => typeof d === "string");
      }
    } else {
      dates = datesRaw.filter((d): d is string => typeof d === "string");
    }
  } else {
    dates = datesRaw.filter((d): d is string => typeof d === "string");
  }

  // Handle pattern - let Zod validate
  const patternRaw = formData.get("pattern");
  let pattern: unknown = null;
  if (typeof patternRaw === "string" && patternRaw) {
    try {
      pattern = JSON.parse(patternRaw);
    } catch {
      pattern = null;
    }
  }

  const result = CreateDoodleSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    dates,
    pattern,
    requireAllDates: formData.get("requireAllDates") === "true",
    allowMaybe: formData.get("allowMaybe") !== "false", // Default true
    hideParticipants: formData.get("hideParticipants") === "true",
    hideScores: formData.get("hideScores") === "true",
  });

  if (!result.success) {
    return {
      status: "error",
      message: result.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const id = crypto.randomUUID();
  await db.insert(doodles).values({
    id,
    title: result.data.title,
    description: result.data.description ?? null,
    dates: result.data.dates,
    pattern: result.data.pattern ?? null,
    createdAt: new Date(),
    requireAllDates: result.data.requireAllDates,
    allowMaybe: result.data.allowMaybe,
    hideParticipants: result.data.hideParticipants,
    hideScores: result.data.hideScores,
  });

  redirect(`/${id}`);
}

export async function castVote(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const responsesRaw = formData.get("responses");
  let responses: unknown;

  if (typeof responsesRaw !== "string") {
    return { status: "error", message: "Invalid responses data" };
  }

  try {
    responses = JSON.parse(responsesRaw);
  } catch {
    return { status: "error", message: "Invalid responses data" };
  }

  const participantIdRaw = formData.get("participantId");
  const result = CastVoteSchema.safeParse({
    doodleId: formData.get("doodleId"),
    participantName: formData.get("participantName"),
    participantId: participantIdRaw || undefined,
    responses,
  });

  if (!result.success) {
    return {
      status: "error",
      message: result.error.issues[0]?.message ?? "Invalid vote data",
    };
  }

  // Filter out undefined responses for storage
  const cleanResponses: Record<string, "yes" | "maybe" | "no"> = {};
  for (const [key, value] of Object.entries(result.data.responses)) {
    if (value !== undefined) {
      cleanResponses[key] = value;
    }
  }

  // If participantId is provided, update existing vote
  if (result.data.participantId) {
    const existing = await db.query.votes.findFirst({
      where: eq(votes.id, result.data.participantId),
    });

    if (!existing || existing.doodleId !== result.data.doodleId) {
      return { status: "error", message: "Vote not found" };
    }

    await db
      .update(votes)
      .set({
        participantName: result.data.participantName,
        responses: cleanResponses,
        updatedAt: new Date(),
      })
      .where(eq(votes.id, result.data.participantId));

    revalidatePath(`/${result.data.doodleId}`);
    return {
      status: "success",
      message: "Vote updated!",
      participantId: result.data.participantId,
    };
  }

  // Otherwise, create new vote - check participant limit first
  const [voteCount] = await db
    .select({ value: count() })
    .from(votes)
    .where(eq(votes.doodleId, result.data.doodleId));

  if (voteCount !== undefined && voteCount.value >= 50) {
    return {
      status: "error",
      message: "This poll has reached the maximum of 50 participants.",
    };
  }

  const newId = crypto.randomUUID();
  await db.insert(votes).values({
    id: newId,
    doodleId: result.data.doodleId,
    participantName: result.data.participantName,
    responses: cleanResponses,
    createdAt: new Date(),
  });

  revalidatePath(`/${result.data.doodleId}`);
  return { status: "success", message: "Vote submitted!", participantId: newId };
}
