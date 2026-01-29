"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db, CreateDoodleSchema, CastVoteSchema } from "@/db";
import { doodles, votes } from "@/db/schema";

export type ActionState =
  | null
  | { status: "error"; message: string }
  | { status: "success"; message: string };

export async function createDoodle(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const result = CreateDoodleSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    dates: formData.getAll("dates"),
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
    createdAt: new Date(),
  });

  redirect(`/${id}`);
}

export async function castVote(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const responsesRaw = formData.get("responses");
  let responses: unknown;
  try {
    responses = responsesRaw ? JSON.parse(responsesRaw as string) : {};
  } catch {
    return { status: "error", message: "Invalid responses data" };
  }

  const result = CastVoteSchema.safeParse({
    doodleId: formData.get("doodleId"),
    participantName: formData.get("participantName"),
    responses,
  });

  if (!result.success) {
    return {
      status: "error",
      message: result.error.issues[0]?.message ?? "Invalid vote data",
    };
  }

  await db.insert(votes).values({
    id: crypto.randomUUID(),
    doodleId: result.data.doodleId,
    participantName: result.data.participantName,
    responses: result.data.responses,
    createdAt: new Date(),
  });

  revalidatePath(`/${result.data.doodleId}`);
  return { status: "success", message: "Vote submitted!" };
}
