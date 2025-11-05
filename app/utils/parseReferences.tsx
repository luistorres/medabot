import { ReactNode } from "react";

interface ParseReferencesOptions {
  onPageClick: (page: number) => void;
}

/**
 * Parses text content and converts page references into clickable buttons
 * Supports patterns like:
 * - "página 3"
 * - "page 3"
 * - "p. 3"
 * - "(ver página 3)"
 */
export function parseMessageWithReferences(
  text: string,
  options: ParseReferencesOptions
): ReactNode[] {
  const { onPageClick } = options;

  // Regex pattern to match page references
  // Matches: "página 3", "page 3", "p. 3", "páginas 3-5", etc.
  const pageReferencePattern =
    /(\(?\s*(?:ver\s+)?(?:página|page|p\.)\s+(\d+)(?:\s*-\s*(\d+))?\s*\)?)/gi;

  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match;

  // Reset regex lastIndex
  pageReferencePattern.lastIndex = 0;

  while ((match = pageReferencePattern.exec(text)) !== null) {
    const fullMatch = match[0];
    const pageNumber = parseInt(match[2], 10);
    const matchIndex = match.index;

    // Add text before the match
    if (matchIndex > lastIndex) {
      parts.push(text.substring(lastIndex, matchIndex));
    }

    // Add clickable page reference
    parts.push(
      <button
        key={`page-ref-${matchIndex}-${pageNumber}`}
        onClick={(e) => {
          e.preventDefault();
          onPageClick(pageNumber);
        }}
        className="inline-flex items-center mx-1 px-2 py-0.5 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded text-xs font-medium transition-colors cursor-pointer border border-blue-300"
        title={`Ir para página ${pageNumber}`}
      >
        📄 {fullMatch.trim()}
      </button>
    );

    lastIndex = matchIndex + fullMatch.length;
  }

  // Add remaining text after last match
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  // If no matches found, return original text
  return parts.length > 0 ? parts : [text];
}
