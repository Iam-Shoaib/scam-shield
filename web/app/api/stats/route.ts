import { NextResponse } from "next/server";
import { getStats } from "@/lib/scam/scanStore";

export const runtime = "nodejs";

export async function GET() {
  try {
    const stats = await getStats();
    return NextResponse.json(stats);
  } catch (err) {
    console.error("failed to load stats", err);
    return NextResponse.json({ error: "Failed to load stats." }, { status: 500 });
  }
}
