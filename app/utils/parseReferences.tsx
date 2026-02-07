import { ReactNode } from "react";
import Chip from "../components/ui/Chip";

interface ParseReferencesOptions {
  onPageClick: (page: number) => void;
}

/**
 * Parses text content and converts page references into clickable Chip components.
 * Supports patterns like "página 3", "page 3", "p. 3", "pág. 3", "secção 3", etc.
 */
export function parseMessageWithReferences(
  text: string,
  options: ParseReferencesOptions
): ReactNode[] {
  const { onPageClick } = options;

  const pageReferencePattern =
    /(\(?\s*(?:ver|consulte|consultar|veja|check|see)?\s*(?:(?:na|da|pela|pelo|para\s+a|com\s+a|de\s+a|em\s+a)\s+|(?:a\s+)?)(?:página|pagina|páginas|paginas|page|pages|pág\.|pag\.|p\.|secção|seção|seccion|section|folha)\s*(\d+)(?:\s*[-–—]\s*(\d+))?\s*\)?)/gi;

  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match;
  let matchCount = 0;

  pageReferencePattern.lastIndex = 0;

  while ((match = pageReferencePattern.exec(text)) !== null) {
    matchCount++;
    const pageNumber = parseInt(match[2], 10);
    const endPage = match[3] ? parseInt(match[3], 10) : null;
    const matchIndex = match.index;

    if (matchIndex > lastIndex) {
      parts.push(text.substring(lastIndex, matchIndex));
    }

    const label = endPage ? `p.${pageNumber}-${endPage}` : `p.${pageNumber}`;

    parts.push(
      <Chip
        key={`page-ref-${matchIndex}-${pageNumber}-${matchCount}`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onPageClick(pageNumber);
        }}
        className="inline-flex !min-h-[28px] !px-2.5 !py-0.5 text-xs mx-0.5 align-baseline"
        active
      >
        {label}
      </Chip>
    );

    lastIndex = matchIndex + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}
