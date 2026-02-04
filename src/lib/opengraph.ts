import ogs from "open-graph-scraper";
import { z } from "zod";
import type { Metadata } from "./opengraph-schema";

// Re-export for backwards compatibility
export { MetadataSchema, type Metadata } from "./opengraph-schema";

// ---- Zod Schema for External API Response

const OgMetadataSchema = z.object({
  ogTitle: z.string().optional(),
  ogDescription: z.string().optional(),
  ogImage: z
    .array(
      z.object({
        url: z.string(),
      })
    )
    .optional(),
  ogSiteName: z.string().optional(),
});

// ---- User Agent Strategies

const USER_AGENTS = {
  facebook:
    "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
  google:
    "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
  none: undefined,
};

function getStrategiesForDomain(hostname: string): Array<string | undefined> {
  if (hostname.includes("airbnb")) {
    // Airbnb: try without UA first, then Facebook bot
    return [USER_AGENTS.none, USER_AGENTS.facebook];
  }
  if (hostname.includes("tripadvisor")) {
    // TripAdvisor actively blocks - try Google bot
    return [USER_AGENTS.google, USER_AGENTS.facebook];
  }
  // Default: Facebook bot works best for OG tags
  return [USER_AGENTS.facebook];
}

// ---- Main Function

export async function fetchMetadata(url: string): Promise<Metadata> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return {
      title: url,
      description: null,
      imageUrl: null,
      siteName: null,
    };
  }

  const hostname = parsedUrl.hostname;
  const strategies = getStrategiesForDomain(hostname);

  for (const userAgent of strategies) {
    try {
      const options: {
        url: string;
        timeout: number;
        fetchOptions?: { headers: Record<string, string> };
      } = {
        url,
        timeout: 10000,
      };
      if (userAgent !== undefined) {
        options.fetchOptions = { headers: { "User-Agent": userAgent } };
      }

      const { result } = await ogs(options);
      const parsed = OgMetadataSchema.safeParse(result);

      if (parsed.success && parsed.data.ogTitle) {
        const firstImage = parsed.data.ogImage?.[0];
        return {
          title: parsed.data.ogTitle ?? null,
          description: parsed.data.ogDescription ?? null,
          imageUrl: firstImage?.url ?? null,
          siteName: parsed.data.ogSiteName ?? hostname,
        };
      }
    } catch {
      continue; // Try next strategy
    }
  }

  // Graceful fallback: use hostname as title
  return {
    title: hostname,
    description: null,
    imageUrl: null,
    siteName: hostname,
  };
}
