import type { MinerCallRecord } from "@/lib/telegraph/scanTypes";
import { humanizeMinerError } from "@/lib/scam/humanizeError";
import { LabelBadge } from "./Badge";
import { ExpandableText } from "./ExpandableText";
import { SignalHashLink } from "./SignalHashLink";

function reasonFor(c: MinerCallRecord): string {
  if (c.ok) return c.verdict?.reason ?? "—";
  return humanizeMinerError(c.error ?? "");
}

const SEVERITY_RANK = { malicious: 0, suspicious: 1, unknown: 2, clean: 3 } as const;

const ROW_TINT: Record<string, string> = {
  malicious: "bg-scam-subtle",
  suspicious: "bg-suspicious-subtle",
};

function sortBySeverity(calls: MinerCallRecord[]): MinerCallRecord[] {
  return [...calls].sort((a, b) => {
    const ra = a.verdict ? SEVERITY_RANK[a.verdict.label] : 4;
    const rb = b.verdict ? SEVERITY_RANK[b.verdict.label] : 4;
    return ra - rb;
  });
}

function VerdictCell({ call }: { call: MinerCallRecord }) {
  if (!call.ok) {
    return (
      <span className="inline-flex items-center rounded px-2 py-0.5 text-[12px] font-medium bg-unknown-fill text-unknown-text">
        error
      </span>
    );
  }
  return call.verdict ? <LabelBadge label={call.verdict.label} /> : <span className="text-steel/50">—</span>;
}

export function EvidenceTable({ calls, live = false }: { calls: MinerCallRecord[]; live?: boolean }) {
  const sorted = sortBySeverity(calls);

  if (sorted.length === 0) {
    return (
      <div className="rounded-lg border border-border-default px-6 py-10 text-center text-[14px] text-steel">
        No miners have answered yet.
      </div>
    );
  }

  return (
    <div>
      {/* Desktop / tablet: a real ledger table, sized to fill its container exactly.
          overflow-x-auto is a safety net, not the primary layout — table-fixed
          + the column widths below are sized to fit without scrolling at the
          widths this table is actually rendered at. */}
      <div className="hidden overflow-x-auto rounded-lg border border-border-default bg-paper-raised sm:block">
        <table className="w-full min-w-[900px] table-fixed text-left text-[13.5px]">
          <colgroup>
            <col className="w-[12%]" />
            <col className="w-[9%]" />
            <col className="w-[12%]" />
            <col className="w-[8%]" />
            <col className="w-[33%]" />
            <col className="w-[6%]" />
            <col className="w-[7%]" />
            <col className="w-[13%]" />
          </colgroup>
          <thead>
            <tr className="text-[12px] text-steel">
              <th className="py-3 pr-3 pl-6 font-medium">Miner</th>
              <th className="py-3 pr-3 font-medium">Category</th>
              <th className="py-3 pr-3 font-medium">Checked</th>
              <th className="py-3 pr-3 font-medium">Verdict</th>
              <th className="py-3 pr-3 font-medium">Reason</th>
              <th className="py-3 pr-3 text-right font-medium">Cost</th>
              <th className="py-3 pr-3 text-right font-medium">Latency</th>
              <th className="py-3 pr-6 font-medium">Signal</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((c, i) => (
              <tr
                key={`${c.minerId}-${i}`}
                className={`border-t border-border-default align-top ${live ? "animate-row-settle" : ""} ${
                  c.verdict ? (ROW_TINT[c.verdict.label] ?? "") : ""
                }`}
              >
                <td className="truncate py-3 pr-3 pl-6 font-medium">{c.minerName}</td>
                <td className="truncate py-3 pr-3 text-steel">{c.category}</td>
                <td className="truncate py-3 pr-3 text-steel" title={c.entity}>
                  {c.entity}
                </td>
                <td className="py-3 pr-3">
                  <VerdictCell call={c} />
                </td>
                <td className="py-3 pr-3 break-words text-graphite/90" title={c.ok ? undefined : c.error}>
                  <ExpandableText text={reasonFor(c)} />
                </td>
                <td className="py-3 pr-3 text-right font-mono text-[12px] text-steel tabular-nums">
                  {c.ok ? `$${c.cost_usd.toFixed(4)}` : "$0"}
                </td>
                <td className="py-3 pr-3 text-right font-mono text-[12px] text-steel tabular-nums">{c.duration_ms}ms</td>
                <td className="py-3 pr-6">
                  <SignalHashLink hash={c.signal_hash} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: stacked findings, each fully readable without horizontal scroll */}
      <div className="space-y-3 sm:hidden">
        {sorted.map((c, i) => (
          <div
            key={`${c.minerId}-${i}`}
            className={`rounded-lg border border-border-default p-4 ${live ? "animate-row-settle" : ""} ${
              c.verdict ? (ROW_TINT[c.verdict.label] ?? "") : ""
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="font-medium">{c.minerName}</span>
              <VerdictCell call={c} />
            </div>
            <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[12px] text-steel">
              <div className="flex min-w-0 gap-1">
                <dt className="shrink-0">Category</dt>
                <dd className="min-w-0 flex-1 truncate text-graphite/80">{c.category}</dd>
              </div>
              <div className="flex min-w-0 gap-1">
                <dt className="shrink-0">Checked</dt>
                <dd className="min-w-0 flex-1 truncate text-graphite/80" title={c.entity}>
                  {c.entity}
                </dd>
              </div>
            </dl>
            <p className="mt-2 text-[13px] text-graphite/90">
              <ExpandableText text={reasonFor(c)} />
            </p>
            <div className="mt-3 flex items-center justify-between border-t border-border-default pt-2 font-mono text-[12px] text-steel">
              <span>{c.ok ? `$${c.cost_usd.toFixed(4)}` : "$0"}</span>
              <span>{c.duration_ms}ms</span>
              <SignalHashLink hash={c.signal_hash} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
