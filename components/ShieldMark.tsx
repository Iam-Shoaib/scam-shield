export function ShieldMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden>
      <path
        d="M16 2.5 27 6.5v8.2c0 8-4.6 13.4-11 14.8-6.4-1.4-11-6.8-11-14.8V6.5L16 2.5Z"
        fill="currentColor"
      />
      <path
        d="M11.5 16.3 14.6 19.4 20.8 12.8"
        stroke="var(--paper)"
        strokeWidth="2.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
