import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getScanById } from "@/lib/scam/scanStore";
import { VerdictCard } from "@/components/VerdictCard";
import { EvidenceTable } from "@/components/EvidenceTable";
import { deriveDisplayVerdict, type DisplayVerdict } from "@/components/Badge";

export const dynamic = "force-dynamic";

const HEADLINE: Record<DisplayVerdict, string> = {
  safe: "Nothing here looks wrong.",
  suspicious: "A few things don't add up.",
  scam: "This is almost certainly a scam.",
  inconclusive: "We couldn't get an answer.",
};

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const scan = await getScanById(id);
  if (!scan) return { title: "Scan not found — Scam Shield" };
  if ("status" in scan) return { title: "Still checking… — Scam Shield" };

  const title = `${HEADLINE[deriveDisplayVerdict(scan)]} — Scam Shield`;
  const description = `Checked across ${scan.uniqueMinersUsed} independent Telegraph miners (${scan.totalCalls} paid calls).`;

  return {
    title,
    description,
    openGraph: { title, description, images: [`/scan/${id}/opengraph-image`] },
    twitter: { card: "summary_large_image", title, description, images: [`/scan/${id}/opengraph-image`] },
  };
}

export default async function ScanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const scan = await getScanById(id);
  if (!scan) notFound();

  if ("status" in scan) {
    return (
      <div className="mx-auto w-full max-w-[1140px] space-y-6 px-5 py-14 sm:px-8">
        <div>
          <p className="text-[13px] text-steel">Submitted message</p>
          <blockquote className="mt-2 border-l-2 border-border-default py-1 pl-4 font-display text-[19px] italic leading-[1.5] text-graphite/90">
            &ldquo;{scan.inputText}&rdquo;
          </blockquote>
        </div>
        <div className="rounded-lg border border-border-default bg-paper-raised px-6 py-8 text-center">
          <p className="font-display text-[22px] text-graphite">Still checking…</p>
          <p className="mt-2 text-[14px] text-steel">
            Miners are still being paid and queried for this one. Refresh this page in a bit —
            it&rsquo;ll show the full verdict as soon as it&rsquo;s ready.
          </p>
        </div>
      </div>
    );
  }

  const headerList = await headers();
  const host = headerList.get("host");
  const protocol = headerList.get("x-forwarded-proto") ?? "https";
  const permalink = host ? `${protocol}://${host}/scan/${scan.id}` : undefined;

  return (
    <div className="mx-auto w-full max-w-[1140px] space-y-6 px-5 py-14 sm:px-8">
      <div>
        <p className="text-[13px] text-steel">Submitted message</p>
        <blockquote className="mt-2 border-l-2 border-border-default py-1 pl-4 font-display text-[19px] italic leading-[1.5] text-graphite/90">
          &ldquo;{scan.inputText}&rdquo;
        </blockquote>
      </div>
      <VerdictCard scan={scan} permalink={permalink} />
      <EvidenceTable calls={scan.calls} />
    </div>
  );
}
