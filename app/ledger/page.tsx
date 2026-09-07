import Link from "next/link";
import { getStats, listScans } from "@/lib/scam/scanStore";
import { OverallBadge } from "@/components/Badge";

export const dynamic = "force-dynamic";

function SmallStat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="text-[20px] font-medium text-graphite">{value}</div>
      <div className="text-[12px] text-steel">{label}</div>
    </div>
  );
}

function VerdictStat({ value, label, colorClass }: { value: number; label: string; colorClass: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className={`text-[18px] font-medium ${colorClass}`}>{value}</span>
      <span className="text-[13px] text-steel">{label}</span>
    </div>
  );
}

export default async function LedgerPage() {
  const [stats, page] = await Promise.all([getStats(), listScans({ limit: 50 })]);

  return (
    <div className="mx-auto w-full max-w-[1140px] space-y-10 px-5 py-14 sm:px-8">
      <div>
        <h1 className="font-display text-[32px] text-graphite">Public ledger</h1>
        <p className="mt-2 max-w-[62ch] text-[15px] text-steel">
          Every scan Scam Shield has run, with every miner call, cost, and signal hash —
          independently checkable on the Telegraph node.
        </p>
      </div>

      <div className="flex flex-col gap-8 rounded-2xl border border-border-default bg-paper-raised p-6 sm:flex-row sm:items-center sm:gap-10 sm:p-8">
        <div className="sm:border-r sm:border-border-default sm:pr-10">
          <div className="font-display text-[52px] leading-none text-graphite">{stats.totalScans}</div>
          <div className="mt-1 text-[13px] text-steel">scans run</div>
        </div>

        <div className="flex flex-1 flex-col gap-6">
          <div className="flex flex-wrap gap-x-8 gap-y-3">
            <SmallStat value={stats.totalCalls.toLocaleString()} label="miner calls" />
            <SmallStat value={stats.uniqueMinersTouched.toLocaleString()} label="unique miners" />
            <SmallStat value={`$${stats.totalCostUsd.toFixed(2)}`} label="total spent" />
          </div>
          <div className="flex flex-wrap gap-x-8 gap-y-2">
            <VerdictStat value={stats.scamCount} label="scam" colorClass="text-scam-text" />
            <VerdictStat value={stats.suspiciousCount} label="suspicious" colorClass="text-suspicious-text" />
            <VerdictStat value={stats.safeCount} label="clean" colorClass="text-safe-text" />
          </div>
        </div>
      </div>

      {page.items.length === 0 ? (
        <div className="rounded-lg border border-border-default px-6 py-14 text-center text-[14px] text-steel">
          No scans yet.{" "}
          <Link href="/" className="text-graphite underline decoration-border-default underline-offset-2">
            Run your first check
          </Link>
          .
        </div>
      ) : (
        <div className="themed-scroll overflow-x-auto rounded-lg border border-border-default bg-paper-raised">
          <table className="w-full min-w-[640px] text-left text-[14px]">
            <thead>
              <tr className="text-[12px] text-steel">
                <th className="py-3 pr-4 pl-6 font-medium">When</th>
                <th className="py-3 pr-4 font-medium">Input</th>
                <th className="py-3 pr-4 font-medium">Verdict</th>
                <th className="py-3 pr-4 text-right font-medium">Calls</th>
                <th className="py-3 pr-6 text-right font-medium">Cost</th>
              </tr>
            </thead>
            <tbody>
              {page.items.map((scan) => (
                <tr key={scan.id} className="border-t border-border-default">
                  <td className="whitespace-nowrap py-3 pr-4 pl-6 text-steel">
                    {new Date(scan.createdAt).toLocaleString()}
                  </td>
                  <td className="max-w-[22rem] truncate py-3 pr-4">
                    <Link href={`/scan/${scan.id}`} className="hover:underline" title={scan.inputText}>
                      {scan.inputText}
                    </Link>
                  </td>
                  <td className="py-3 pr-4">
                    <OverallBadge scan={scan} />
                  </td>
                  <td className="py-3 pr-4 text-right font-mono text-[12px] tabular-nums text-steel">
                    {scan.totalCalls}
                  </td>
                  <td className="py-3 pr-6 text-right font-mono text-[12px] tabular-nums text-steel">
                    ${scan.totalCostUsd.toFixed(4)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
