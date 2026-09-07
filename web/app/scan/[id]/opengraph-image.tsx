import { ImageResponse } from "next/og";
import { getScanById } from "@/lib/scam/scanStore";
import { deriveDisplayVerdict, type DisplayVerdict } from "@/components/Badge";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const COLORS: Record<DisplayVerdict, { text: string; fill: string }> = {
  safe: { text: "#247B52", fill: "#E6F5EE" },
  suspicious: { text: "#8B631D", fill: "#F5EFE6" },
  scam: { text: "#C22E3A", fill: "#F5E6E7" },
  inconclusive: { text: "#5B5F52", fill: "#DEE1D8" },
};

const WORD: Record<DisplayVerdict, string> = {
  safe: "Safe.",
  suspicious: "Suspicious.",
  scam: "Scam.",
  inconclusive: "Inconclusive.",
};

export default async function Image({ params }: { params: { id: string } }) {
  const scan = await getScanById(params.id);
  const variant = scan ? deriveDisplayVerdict(scan) : "suspicious";
  const colors = COLORS[variant];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 80,
          backgroundColor: "#F4F5F1",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 22, color: "#5B5F52", display: "flex" }}>Scam Shield</div>
          <div style={{ fontSize: 96, color: colors.text, marginTop: 24, display: "flex" }}>{WORD[variant]}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 24, color: "#5B5F52" }}>
          {scan ? (
            <>
              <div style={{ display: "flex" }}>Checked by {scan.uniqueMinersUsed} independent miners</div>
              <div style={{ display: "flex" }}>
                {scan.totalCalls} paid calls, ${scan.totalCostUsd.toFixed(2)} in x402 micropayments
              </div>
            </>
          ) : (
            <div style={{ display: "flex" }}>Independent verdicts, paid live via x402.</div>
          )}
        </div>
      </div>
    ),
    { ...size }
  );
}
