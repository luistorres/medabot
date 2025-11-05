import { ReactNode } from "react";

interface ParseReferencesOptions {
  onPageClick: (page: number) => void;
}

/**
 * Parses text content and converts page references into clickable buttons
 * Supports patterns like:
 * - "página 3", "páginas 3", "pagina 3"
 * - "page 3", "pages 3"
 * - "p. 3", "p.3"
 * - "pág. 3", "pag. 3"
 * - "(ver página 3)", "(consulte página 3)"
 * - "secção 3", "section 3"
 * - Numbers alone in context like "...informações na 3 do folheto"
 */
export function parseMessageWithReferences(
  text: string,
  options: ParseReferencesOptions
): ReactNode[] {
  const { onPageClick } = options;

  // More comprehensive regex pattern to match various page reference formats
  // Matches: "página 3", "page 3", "p. 3", "pág. 3", "secção 3", etc.
  const pageReferencePattern =
    /(\(?\s*(?:ver|consulte|consultar|veja|check|see)?\s*(?:a\s+)?(?:página|pagina|páginas|paginas|page|pages|pág\.|pag\.|p\.|secção|seção|seccion|section|folha)\s*(\d+)(?:\s*[-–—]\s*(\d+))?\s*\)?)/gi;

  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match;

  // Reset regex lastIndex
  pageReferencePattern.lastIndex = 0;

  let matchCount = 0;
  while ((match = pageReferencePattern.exec(text)) !== null) {
    matchCount++;
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
        key={`page-ref-${matchIndex}-${pageNumber}-${matchCount}`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log(`Clicking page reference: ${pageNumber}`);
          onPageClick(pageNumber);
        }}
        className="inline-flex items-center mx-1 px-2 py-0.5 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded text-xs font-medium transition-colors cursor-pointer border border-blue-300 hover:shadow-sm"
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

  // Debug logging
  if (matchCount > 0) {
    console.log(`Found ${matchCount} page references in message`);
  }

  // If no matches found, return original text
  return parts.length > 0 ? parts : [text];
}
