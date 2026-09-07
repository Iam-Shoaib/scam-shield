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

export async function saveScan(scan: ScanResult): Promise<string> {
  const db = await getDb();
  const doc: ScanDocument = { ...scan };
  delete (doc as { id?: string }).id;
  const result = await db.collection<ScanDocument>(COLLECTION).insertOne(doc);
  return result.insertedId.toHexString();
}

export async function getScanById(id: string): Promise<ScanResult | null> {
  if (!ObjectId.isValid(id)) return null;
  const db = await getDb();
  const doc = await db.collection<ScanDocument>(COLLECTION).findOne({ _id: new ObjectId(id) });
  return doc ? toScanResult(doc as ScanDocument & { _id: ObjectId }) : null;
}

export async function listScans(opts: { cursor?: string; limit?: number } = {}): Promise<{
  items: ScanResult[];
  nextCursor: string | null;
}> {
  const limit = Math.min(opts.limit ?? 20, 100);
  const db = await getDb();
  const query = opts.cursor && ObjectId.isValid(opts.cursor) ? { _id: { $lt: new ObjectId(opts.cursor) } } : {};

  const docs = await db
    .collection<ScanDocument>(COLLECTION)
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
