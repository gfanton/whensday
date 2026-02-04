import { z } from "zod";

// ---- Output Schema (Single Source of Truth)

export const MetadataSchema = z.object({
  title: z.string().nullable(),
  description: z.string().nullable(),
  imageUrl: z.string().nullable(),
  siteName: z.string().nullable(),
});

export type Metadata = z.infer<typeof MetadataSchema>;
