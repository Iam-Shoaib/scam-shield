import { NextResponse } from "next/server";
import { listScans } from "@/lib/scam/scanStore";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor") ?? undefined;
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? Number(limitParam) : undefined;

  try {
    const page = await listScans({ cursor, limit });
    return NextResponse.json(page);
  } catch (err) {
    console.error("failed to list scans", err);
    return NextResponse.json({ error: "Failed to load scans." }, { status: 500 });
  }
}
