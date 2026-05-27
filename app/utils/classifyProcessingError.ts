/**
 * classifyProcessingError
 *
 * Maps a raw error message string (thrown by server functions) into a
 * user-facing classification with a title, a non-blaming message and
 * a primary action hint.
 *
 * Error tag prefixes are injected by fetchRegulatoryPdf.ts:
 *   "INFARMED_NOT_FOUND:" — clean "nothing found" result
 *   "INFARMED_SERVICE:"   — network / Playwright / scraping failure
 *
 * Everything else falls through to the generic bucket.
 */

export type ErrorKind = "not-found" | "service-unavailable" | "generic";

export interface ClassifiedError {
  kind: ErrorKind;
  title: string;
  message: string;
  /** Which action button to show as primary: "retry" | "search" */
  primaryAction: "retry" | "search";
}

export function classifyProcessingError(raw: string): ClassifiedError {
  if (raw.startsWith("INFARMED_NOT_FOUND:")) {
    return {
      kind: "not-found",
      title: "Folheto não encontrado",
      message:
        "Não foi possível encontrar o folheto informativo deste medicamento na base de dados do INFARMED. " +
        "Verifique o nome ou tente a pesquisa avançada.",
      primaryAction: "search",
    };
  }

  if (raw.startsWith("INFARMED_SERVICE:")) {
    return {
      kind: "service-unavailable",
      title: "Serviço temporariamente indisponível",
      message:
        "Não foi possível contactar o INFARMED neste momento. " +
        "Pode ser uma indisponibilidade temporária — aguarde uns instantes e tente novamente.",
      primaryAction: "retry",
    };
  }

  // Playwright / timeout patterns that leak through without a tag
  const lowerRaw = raw.toLowerCase();
  if (
    lowerRaw.includes("timeout") ||
    lowerRaw.includes("timed out") ||
    lowerRaw.includes("network") ||
    lowerRaw.includes("econnrefused") ||
    lowerRaw.includes("econnreset") ||
    lowerRaw.includes("playwright") ||
    lowerRaw.includes("target page") ||
    lowerRaw.includes("browser has been closed")
  ) {
    return {
      kind: "service-unavailable",
      title: "Serviço temporariamente indisponível",
      message:
        "Ocorreu um problema de ligação ao obter o folheto. " +
        "Verifique a sua ligação à internet e tente novamente.",
      primaryAction: "retry",
    };
  }

  return {
    kind: "generic",
    title: "Algo correu mal",
    message:
      "Ocorreu um erro inesperado. Se o problema persistir, tente pesquisar pelo nome do medicamento.",
    primaryAction: "retry",
  };
}
