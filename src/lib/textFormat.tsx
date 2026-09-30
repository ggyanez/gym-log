import type { ReactNode } from "react";

// Minimal inline formatting, own markup (never HTML) so rendering it is
// always safe: **bold**, _italic_, ++underline++. Line breaks are handled
// by the caller's `whitespace-pre-wrap`, not here — this only tokenizes
// the inline marks and returns plain strings/elements in sequence.
const FORMAT_RE = /\*\*(.+?)\*\*|\+\+(.+?)\+\+|_(.+?)_/g;

export function renderFormatted(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;
  let match: RegExpExecArray | null;

  FORMAT_RE.lastIndex = 0;
  while ((match = FORMAT_RE.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    if (match[1] !== undefined) {
      nodes.push(<strong key={key++}>{match[1]}</strong>);
    } else if (match[2] !== undefined) {
      nodes.push(<u key={key++}>{match[2]}</u>);
    } else if (match[3] !== undefined) {
      nodes.push(<em key={key++}>{match[3]}</em>);
    }
    lastIndex = FORMAT_RE.lastIndex;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}
