import "server-only";

import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongo";
import type { ScanResult } from "@/lib/telegraph/scanTypes";

const COLLECTION = "scans";

type ScanDocument = Omit<ScanResult, "id"> & { _id?: ObjectId };

function toScanResult(doc: ScanDocument & { _id: ObjectId }): ScanResult {
  const { _id, ...rest } = doc;
  return { ...rest, id: _id.toHexString() };
}

export type PendingScan = { id: string; status: "pending"; createdAt: string; inputText: string };

/**
 * Inserted the moment a scan starts, before any miner has been called, so
 * the extension (whose background page can be evicted mid-stream by
 * Firefox's idle timer) has a stable /scan/{id} link to fall back to even
 * if it never hears the final result itself — the scan keeps running and
 * finalizing server-side either way.
 */
export async function createPendingScan(inputText: string): Promise<string> {
  const db = await getDb();
  const _id = new ObjectId();
  await db.collection(COLLECTION).insertOne({
    _id,
    status: "pending",
    createdAt: new Date().toISOString(),
    inputText,
  });
  return _id.toHexString();
}

/** Removes a pending placeholder if the scan fails before finishing, so its link 404s instead of hanging as "still checking" forever. */
export async function deletePendingScan(id: string): Promise<void> {
  if (!ObjectId.isValid(id)) return;
  const db = await getDb();
  await db.collection(COLLECTION).deleteOne({ _id: new ObjectId(id), status: "pending" });
}

export async function finalizeScan(id: string, scan: ScanResult): Promise<void> {
  const db = await getDb();
  const doc: ScanDocument = { ...scan };
  delete (doc as { id?: string }).id;
  await db.collection<ScanDocument>(COLLECTION).replaceOne({ _id: new ObjectId(id) }, doc, { upsert: true });
}

export async function getScanById(id: string): Promise<ScanResult | PendingScan | null> {
  if (!ObjectId.isValid(id)) return null;
  const db = await getDb();
  const doc = await db.collection(COLLECTION).findOne({ _id: new ObjectId(id) });
  if (!doc) return null;
  if (doc.status === "pending") {
    return { id: doc._id.toHexString(), status: "pending", createdAt: doc.createdAt, inputText: doc.inputText };
  }
  return toScanResult(doc as ScanDocument & { _id: ObjectId });
}

export async function listScans(opts: { cursor?: string; limit?: number } = {}): Promise<{
  items: ScanResult[];
  nextCursor: string | null;
}> {
  const limit = Math.min(opts.limit ?? 20, 100);
  const db = await getDb();
  const query = {
    status: { $ne: "pending" },
    ...(opts.cursor && ObjectId.isValid(opts.cursor) ? { _id: { $lt: new ObjectId(opts.cursor) } } : {}),
  };

  const docs = await db
    .collection(COLLECTION)
    .find(query)
    .sort({ _id: -1 })
    .limit(limit + 1)
    .toArray();

  const hasMore = docs.length > limit;
  const page = hasMore ? docs.slice(0, limit) : docs;

  return {
    items: page.map((d) => toScanResult(d as ScanDocument & { _id: ObjectId })),
    nextCursor: hasMore ? page[page.length - 1]._id!.toHexString() : null,
  };
}

export type ScamShieldStats = {
  totalScans: number;
  totalCalls: number;
  totalCostUsd: number;
  uniqueMinersTouched: number;
  scamCount: number;
  suspiciousCount: number;
  safeCount: number;
};

export async function getStats(): Promise<ScamShieldStats> {
  const db = await getDb();
  const collection = db.collection<ScanDocument>(COLLECTION);

  const [totals] = await collection
    .aggregate<{
      totalScans: number;
      totalCalls: number;
      totalCostUsd: number;
      minerIds: string[][];
      scamCount: number;
      suspiciousCount: number;
      safeCount: number;
    }>([
      { $match: { status: { $ne: "pending" } } },
      {
        $group: {
          _id: null,
          totalScans: { $sum: 1 },
          totalCalls: { $sum: "$totalCalls" },
          totalCostUsd: { $sum: "$totalCostUsd" },
          minerIds: { $push: "$calls.minerId" },
          scamCount: { $sum: { $cond: [{ $eq: ["$overallVerdict", "SCAM"] }, 1, 0] } },
          suspiciousCount: { $sum: { $cond: [{ $eq: ["$overallVerdict", "SUSPICIOUS"] }, 1, 0] } },
          safeCount: { $sum: { $cond: [{ $eq: ["$overallVerdict", "SAFE"] }, 1, 0] } },
        },
      },
    ])
    .toArray();

  if (!totals) {
    return {
      totalScans: 0,
      totalCalls: 0,
      totalCostUsd: 0,
      uniqueMinersTouched: 0,
      scamCount: 0,
      suspiciousCount: 0,
      safeCount: 0,
    };
  }

  const uniqueMinersTouched = new Set(totals.minerIds.flat(2)).size;

  return {
    totalScans: totals.totalScans,
    totalCalls: totals.totalCalls,
    totalCostUsd: totals.totalCostUsd,
    uniqueMinersTouched,
    scamCount: totals.scamCount,
    suspiciousCount: totals.suspiciousCount,
    safeCount: totals.safeCount,
  };
}
