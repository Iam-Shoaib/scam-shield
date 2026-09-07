import type { Metadata } from "next";
import { ScanForm } from "@/components/ScanForm";

export const metadata: Metadata = {
  title: "Check a message — Scam Shield",
};

export default function CheckPage() {
  return (
    <div className="mx-auto w-full max-w-[1320px] px-5 py-14 sm:px-8 sm:py-20">
      <div className="mb-10 max-w-[680px] space-y-4">
        <h1 className="font-display text-[38px] leading-[1.1] text-graphite sm:text-[46px]">
          Get a straight answer, from twenty places that don&rsquo;t agree on much.
        </h1>
        <p className="max-w-[58ch] text-[16px] leading-[1.6] text-steel">
          Paste a suspicious message, email, or link. Scam Shield pays 20+ independent
          examiners on the Telegraph network to look at it — link safety, certificates,
          sender reputation, scam-pattern classifiers, AI-text detection — and hands you
          one honest verdict, with every finding shown.
        </p>
      </div>
      <ScanForm />
    </div>
  );
}
