import Image from "next/image";

export function ShieldMark({ className = "" }: { className?: string }) {
  return (
    <Image
      src="/SCAM-SHIELD-lOGO-ICON.png"
      alt=""
      width={32}
      height={32}
      className={className}
      priority
    />
  );
}
