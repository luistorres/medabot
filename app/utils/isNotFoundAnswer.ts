/**
 * Detects if the assistant's answer is a "not found in leaflet" response.
 * The backend prompt instructs the model to reply with this phrasing when
 * the information is not in the leaflet.
 */
export function isNotFoundAnswer(content: string): boolean {
  const lower = content.toLowerCase();
  return (
    lower.includes("não encontro essa informação no folheto") ||
    lower.includes("não encontrei essa informação no folheto") ||
    lower.includes("não consta no folheto")
  );
}
