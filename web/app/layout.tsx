import type { Metadata } from "next";
import Link from "next/link";
import { IBM_Plex_Mono, IBM_Plex_Sans, Newsreader } from "next/font/google";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ShieldMark } from "@/components/ShieldMark";
import { SiteFooter } from "@/components/SiteFooter";
import "./globals.css";

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Scam Shield — a verdict from 20 independent sources",
  description:
    "Paste a suspicious message, email, or link. Scam Shield pays 20+ independent Telegraph miners to check it and hands back one plain verdict, with every finding shown.",
};

const NO_FLASH_THEME_SCRIPT = `
try {
  var t = localStorage.getItem('theme');
  if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
} catch (e) {}
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${newsreader.variable} ${plexSans.variable} ${plexMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_THEME_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col bg-paper font-sans text-graphite">
        <header className="border-b border-border-default">
          <nav className="mx-auto flex w-full max-w-[1140px] items-center justify-between px-5 py-5 sm:px-8">
            <Link href="/" className="flex items-center gap-2 text-[15px] font-semibold tracking-tight text-graphite">
              <ShieldMark className="h-[19px] w-[19px] text-safe-text" />
              Scam Shield
            </Link>
            <div className="flex items-center gap-6 text-[14px] text-steel">
              <Link href="/ledger" className="hidden transition hover:text-graphite sm:inline">
                Ledger
              </Link>
              <Link href="/pricing" className="hidden transition hover:text-graphite sm:inline">
                Pricing
              </Link>
              <Link href="/about" className="hidden transition hover:text-graphite sm:inline">
                About
              </Link>
              <Link
                href="/check"
                className="rounded-full bg-graphite px-4 py-1.5 text-[13px] font-medium text-paper transition hover:opacity-90"
              >
                Check a message
              </Link>
              <ThemeToggle />
            </div>
          </nav>
        </header>
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
