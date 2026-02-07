import { ReactNode } from "react";

/**
 * Lightweight markdown renderer — handles **bold**, *italic*, bullet lists,
 * numbered lists, and line breaks. No external dependency.
 */
export function formatMessage(text: string): ReactNode[] {
  const lines = text.split("\n");
  const result: ReactNode[] = [];
  let currentList: { type: "ul" | "ol"; items: ReactNode[] } | null = null;
  let key = 0;

  const flushList = () => {
    if (!currentList) return;
    if (currentList.type === "ul") {
      result.push(
        <ul key={`list-${key++}`} className="list-disc pl-5 my-2 space-y-1">
          {currentList.items.map((item, i) => (
            <li key={i} className="text-sm leading-relaxed">{item}</li>
          ))}
        </ul>
      );
    } else {
      result.push(
        <ol key={`list-${key++}`} className="list-decimal pl-5 my-2 space-y-1">
          {currentList.items.map((item, i) => (
            <li key={i} className="text-sm leading-relaxed">{item}</li>
          ))}
        </ol>
      );
    }
    currentList = null;
  };

  for (const line of lines) {
    const trimmed = line.trim();

    // Bullet list items: - or *
    const bulletMatch = trimmed.match(/^[-*]\s+(.+)/);
    if (bulletMatch) {
      if (currentList?.type !== "ul") {
        flushList();
        currentList = { type: "ul", items: [] };
      }
      currentList!.items.push(formatInline(bulletMatch[1]));
      continue;
    }

    // Numbered list items: 1. or 1)
    const numberedMatch = trimmed.match(/^\d+[.)]\s+(.+)/);
    if (numberedMatch) {
      if (currentList?.type !== "ol") {
        flushList();
        currentList = { type: "ol", items: [] };
      }
      currentList!.items.push(formatInline(numberedMatch[1]));
      continue;
    }

    // Not a list line — flush any open list
    flushList();

    if (trimmed === "") {
      result.push(<br key={`br-${key++}`} />);
    } else {
      result.push(
        <p key={`p-${key++}`} className="text-sm leading-relaxed">
          {formatInline(trimmed)}
        </p>
      );
    }
  }

  flushList();
  return result;
}

/** Inline formatting: **bold** and *italic* */
function formatInline(text: string): ReactNode {
  // Match **bold** and *italic*
  const pattern = /(\*\*(.+?)\*\*|\*(.+?)\*)/g;
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match;
  let i = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    if (match[2]) {
      // **bold**
      parts.push(<strong key={`b-${i++}`}>{match[2]}</strong>);
    } else if (match[3]) {
      // *italic*
      parts.push(<em key={`i-${i++}`}>{match[3]}</em>);
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length === 1 ? parts[0] : <>{parts}</>;
}
