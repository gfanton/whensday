import { NextRequest, NextResponse } from "next/server";
import { fetchMetadata, type Metadata } from "@/lib/opengraph";

export async function GET(request: NextRequest): Promise<NextResponse<Metadata | { error: string }>> {
  const url = request.nextUrl.searchParams.get("url");

  if (url === null || url === "") {
    return NextResponse.json({ error: "URL parameter is required" }, { status: 400 });
  }

  // Validate URL format
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol !== "https:") {
      return NextResponse.json({ error: "URL must use HTTPS" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
  }

  const metadata = await fetchMetadata(url);
  return NextResponse.json(metadata);
}
