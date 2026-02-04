import type { ReactElement } from "react";
import Image from "next/image";
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
    <div className="relative min-h-screen bg-base">
      {/* Mobile: Icon button in top-right */}
      <a
        href="/"
        className="absolute top-6 right-6 z-50 w-14 h-14 rounded-full bg-surface0 border border-surface1 flex items-center justify-center hover:border-blue hover:scale-105 active:scale-95 transition-all sm:hidden"
        title="Back to home"
      >
        <Image
          src="/logo-128.png"
          alt="Back to home"
          width={128}
          height={128}
          className="w-9 h-7"
        />
      </a>

      <main className="mx-auto max-w-3xl px-4 pt-20 sm:pt-12 pb-12">
        <header className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-text">{doodle.title}</h1>
            {doodle.description && (
              <p className="mt-2 text-subtext0">{doodle.description}</p>
            )}
            <ShareButton />
          </div>
          {/* Desktop: Title image on right */}
          <a
            href="/"
            className="hidden sm:block hover:opacity-80 transition-opacity flex-shrink-0"
            title="Back to home"
          >
            <Image
              src="/title-1024.png"
              alt="Whensday - back to home"
              width={816}
              height={201}
              className="h-10 w-auto"
            />
          </a>
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
