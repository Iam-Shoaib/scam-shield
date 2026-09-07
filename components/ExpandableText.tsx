"use client";

import { useState } from "react";

const TRUNCATE_AT = 110;

export function ExpandableText({ text, className = "" }: { text: string; className?: string }) {
  const [expanded, setExpanded] = useState(false);
  const needsTruncation = text.length > TRUNCATE_AT;

  if (!needsTruncation) {
    return <span className={className}>{text}</span>;
  }

  return (
    <span className={className}>
      {expanded ? text : `${text.slice(0, TRUNCATE_AT).trimEnd()}…`}{" "}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="whitespace-nowrap text-steel underline decoration-border-default underline-offset-2 hover:text-graphite"
      >
        {expanded ? "Show less" : "Show more"}
      </button>
    </span>
  );
}
