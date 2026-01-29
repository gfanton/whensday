import type { ReactElement } from "react";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { doodles, votes } from "@/db/schema";
import { VoteGrid } from "@/components/vote-grid";
import { VoteForm, ShareButton } from "./vote-form";

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

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="mx-auto max-w-3xl px-4 py-12">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{doodle.title}</h1>
          {doodle.description && (
            <p className="mt-2 text-gray-600">{doodle.description}</p>
          )}
          <ShareButton />
        </header>

        <section className="mb-8 rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Votes</h2>
          <VoteGrid dates={doodle.dates} votes={allVotes} />
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Add Your Vote
          </h2>
          <VoteForm doodleId={doodle.id} dates={doodle.dates} />
        </section>
      </main>
    </div>
  );
}
