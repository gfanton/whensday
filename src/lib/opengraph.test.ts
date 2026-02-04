import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchMetadata } from "./opengraph";

// Mock open-graph-scraper
vi.mock("open-graph-scraper", () => ({
  default: vi.fn(),
}));

import ogs from "open-graph-scraper";

const mockOgs = vi.mocked(ogs);

describe("opengraph", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("fetchMetadata", () => {
    it("extracts metadata from a successful response", async () => {
      mockOgs.mockResolvedValueOnce({
        result: {
          ogTitle: "Beautiful Beach House",
          ogDescription: "A stunning beachfront property",
          ogImage: [{ url: "https://example.com/image.jpg" }],
          ogSiteName: "Booking.com",
        },
        error: false,
        html: "",
        response: {} as Response,
      });

      const result = await fetchMetadata("https://www.booking.com/hotel/123");

      expect(result).toEqual({
        title: "Beautiful Beach House",
        description: "A stunning beachfront property",
        imageUrl: "https://example.com/image.jpg",
        siteName: "Booking.com",
      });
    });

    it("returns hostname as fallback when no OG data", async () => {
      mockOgs.mockResolvedValueOnce({
        result: {},
        error: false,
        html: "",
        response: {} as Response,
      });

      const result = await fetchMetadata("https://www.example.com/page");

      expect(result).toEqual({
        title: "www.example.com",
        description: null,
        imageUrl: null,
        siteName: "www.example.com",
      });
    });

    it("returns hostname when ogs throws an error", async () => {
      mockOgs.mockRejectedValueOnce(new Error("Network error"));

      const result = await fetchMetadata("https://www.example.com/page");

      expect(result).toEqual({
        title: "www.example.com",
        description: null,
        imageUrl: null,
        siteName: "www.example.com",
      });
    });

    it("uses hostname as siteName when ogSiteName is missing", async () => {
      mockOgs.mockResolvedValueOnce({
        result: {
          ogTitle: "Test Title",
        },
        error: false,
        html: "",
        response: {} as Response,
      });

      const result = await fetchMetadata("https://www.mysite.com/page");

      expect(result.title).toBe("Test Title");
      expect(result.siteName).toBe("www.mysite.com");
    });

    it("handles missing ogImage gracefully", async () => {
      mockOgs.mockResolvedValueOnce({
        result: {
          ogTitle: "No Image Property",
          ogDescription: "This has no image",
        },
        error: false,
        html: "",
        response: {} as Response,
      });

      const result = await fetchMetadata("https://example.com/page");

      expect(result.imageUrl).toBeNull();
    });

    it("extracts first image from ogImage array", async () => {
      mockOgs.mockResolvedValueOnce({
        result: {
          ogTitle: "Multiple Images",
          ogImage: [
            { url: "https://example.com/first.jpg" },
            { url: "https://example.com/second.jpg" },
          ],
        },
        error: false,
        html: "",
        response: {} as Response,
      });

      const result = await fetchMetadata("https://example.com/page");

      expect(result.imageUrl).toBe("https://example.com/first.jpg");
    });

    it("returns URL as title for invalid URLs", async () => {
      const result = await fetchMetadata("not-a-valid-url");

      expect(result.title).toBe("not-a-valid-url");
      expect(result.description).toBeNull();
      expect(result.imageUrl).toBeNull();
      expect(result.siteName).toBeNull();
    });
  });

  describe("domain-specific strategies", () => {
    it("tries multiple strategies for Airbnb URLs", async () => {
      // First attempt (no UA) fails
      mockOgs.mockRejectedValueOnce(new Error("403 Forbidden"));
      // Second attempt (Facebook UA) succeeds
      mockOgs.mockResolvedValueOnce({
        result: {
          ogTitle: "Airbnb Listing",
          ogSiteName: "Airbnb",
        },
        error: false,
        html: "",
        response: {} as Response,
      });

      const result = await fetchMetadata("https://www.airbnb.com/rooms/12345");

      expect(mockOgs).toHaveBeenCalledTimes(2);
      expect(result.title).toBe("Airbnb Listing");
    });

    it("falls back to hostname when all strategies fail for Airbnb", async () => {
      mockOgs.mockRejectedValue(new Error("403 Forbidden"));

      const result = await fetchMetadata("https://www.airbnb.com/rooms/12345");

      expect(result).toEqual({
        title: "www.airbnb.com",
        description: null,
        imageUrl: null,
        siteName: "www.airbnb.com",
      });
    });

    it("uses Google bot UA for TripAdvisor URLs", async () => {
      mockOgs.mockResolvedValueOnce({
        result: {
          ogTitle: "TripAdvisor Hotel",
        },
        error: false,
        html: "",
        response: {} as Response,
      });

      await fetchMetadata("https://www.tripadvisor.com/Hotel-123");

      expect(mockOgs).toHaveBeenCalledWith(
        expect.objectContaining({
          fetchOptions: {
            headers: {
              "User-Agent": expect.stringContaining("Googlebot"),
            },
          },
        })
      );
    });

    it("uses Facebook bot UA for generic URLs", async () => {
      mockOgs.mockResolvedValueOnce({
        result: {
          ogTitle: "Generic Page",
        },
        error: false,
        html: "",
        response: {} as Response,
      });

      await fetchMetadata("https://www.example.com/page");

      expect(mockOgs).toHaveBeenCalledWith(
        expect.objectContaining({
          fetchOptions: {
            headers: {
              "User-Agent": expect.stringContaining("facebookexternalhit"),
            },
          },
        })
      );
    });
  });

  describe("Zod validation", () => {
    it("handles malformed response data gracefully", async () => {
      mockOgs.mockResolvedValueOnce({
        result: {
          ogTitle: 12345 as unknown as string, // Wrong type - testing validation
          ogImage: "not-an-array" as unknown as Array<{ url: string }>, // Wrong type - testing validation
        },
        error: false,
        html: "",
        response: {} as Response,
      });

      const result = await fetchMetadata("https://example.com/page");

      // Should fall back to hostname due to validation failure
      expect(result.title).toBe("example.com");
    });

    it("handles empty ogImage array", async () => {
      mockOgs.mockResolvedValueOnce({
        result: {
          ogTitle: "Empty Images",
          ogImage: [],
        },
        error: false,
        html: "",
        response: {} as Response,
      });

      const result = await fetchMetadata("https://example.com/page");

      expect(result.title).toBe("Empty Images");
      expect(result.imageUrl).toBeNull();
    });
  });
});
