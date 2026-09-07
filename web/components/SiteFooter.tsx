import Link from "next/link";
import { ShieldMark } from "./ShieldMark";

const PRODUCT_LINKS = [
  { href: "/check", label: "Check a message" },
  { href: "/ledger", label: "Public ledger" },
  { href: "/pricing", label: "Pricing" },
];

const LEARN_LINKS = [
  { href: "/about", label: "How it works" },
  { href: "https://telegraphprotocol.com", label: "Telegraph Protocol" },
];

function FooterColumn({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <div>
      <h3 className="text-[12px] text-steel">{title}</h3>
      <ul className="mt-3 space-y-2">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="text-[13.5px] text-graphite/80 transition hover:text-graphite">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border-default">
      <div className="mx-auto w-full max-w-[1140px] px-5 py-12 sm:px-8">
        <div className="grid gap-10 sm:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2 text-[14px] font-semibold text-graphite">
              <ShieldMark className="h-[17px] w-[17px] text-safe-text" />
              Scam Shield
            </div>
            <p className="mt-3 max-w-[34ch] text-[13.5px] leading-[1.6] text-steel">
              One honest verdict from twenty-plus independent examiners, paid live and shown
              in full.
            </p>
          </div>
          <FooterColumn title="Product" links={PRODUCT_LINKS} />
          <FooterColumn title="Learn" links={LEARN_LINKS} />
        </div>

        <div className="mt-10 border-t border-border-default pt-6 text-[12.5px] text-steel">
          Every check listed here is a real payment to an independent miner — not a cached
          answer.
        </div>
      </div>
    </footer>
  );
}
