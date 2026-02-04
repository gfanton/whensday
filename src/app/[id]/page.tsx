import type { ReactElement } from "react";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { doodles, votes, accommodations } from "@/db/schema";
import { VoteSection } from "./vote-section";
import { ShareButton } from "./vote-form";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function DoodlePage({
  params,
}: Props): Promise<ReactElement> {
  const { id } = await params;

  const doodle = await db.query.doodles.findFirst({
    where: eq(doodles.id, id),
  });

  if (!doodle) {
    notFound();
  }

  const allVotes = await db.query.votes.findMany({
    where: eq(votes.doodleId, id),
    orderBy: (votes, { asc }) => [asc(votes.createdAt)],
  });

  // Fetch accommodations
  const allAccommodations = await db.query.accommodations.findMany({
    where: eq(accommodations.doodleId, id),
    orderBy: (accommodations, { desc }) => [desc(accommodations.createdAt)],
  });

  // Convert to serializable data (no Date objects)
  const serializableDoodle = {
    id: doodle.id,
    title: doodle.title,
    description: doodle.description,
    dates: doodle.dates,
    pattern: doodle.pattern,
    requireAllDates: doodle.requireAllDates,
    allowMaybe: doodle.allowMaybe,
    hideParticipants: doodle.hideParticipants,
    hideScores: doodle.hideScores,
  };

  const serializableVotes = allVotes.map((vote) => ({
    id: vote.id,
    doodleId: vote.doodleId,
    participantName: vote.participantName,
    responses: vote.responses,
  }));

  const serializableAccommodations = allAccommodations.map((acc) => ({
    id: acc.id,
    doodleId: acc.doodleId,
    url: acc.url,
    title: acc.title,
    description: acc.description,
    imageUrl: acc.imageUrl,
    siteName: acc.siteName,
    upvotes: acc.upvotes,
    downvotes: acc.downvotes,
    submitterName: acc.submitterName,
    comment: acc.comment,
  }));

  return (
    <div className="min-h-screen bg-base">
      <main className="mx-auto max-w-3xl px-4 py-12">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-text">{doodle.title}</h1>
          {doodle.description && (
            <p className="mt-2 text-subtext0">{doodle.description}</p>
          )}
          <ShareButton />
        </header>

        <VoteSection
          doodle={serializableDoodle}
          votes={serializableVotes}
          accommodations={serializableAccommodations}
        />
      </main>
    </div>
  );
}
