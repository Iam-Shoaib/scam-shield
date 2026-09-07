import { NextResponse } from "next/server";
import { getScanById } from "@/lib/scam/scanStore";

export const runtime = "nodejs";

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  try {
    const scan = await getScanById(id);
    if (!scan) {
      return NextResponse.json({ error: "Scan not found." }, { status: 404 });
    }
    return NextResponse.json(scan);
  } catch (err) {
    console.error("failed to load scan", err);
    return NextResponse.json({ error: "Failed to load scan." }, { status: 500 });
  }
}
