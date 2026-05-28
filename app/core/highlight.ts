/**
 * Key-claim highlight post-processing for leaflet Q&A answers.
 *
 * The chat model returns { answer, highlightPhrase } as structured output and
 * never emits `==...==` markers itself (see leafletProcessor.queryLeaflet). The
 * server is the only place that turns a phrase into a highlight, which keeps the
 * marker out of the model's content channel and guarantees the highlighted text
 * is verbatim from the answer. These helpers are pure (no I/O) so they can be
 * unit-tested directly — see scripts/test-highlight.ts.
 */

// Max size for a sensible inline highlight. A "key claim" is a short phrase, not
// a sentence; anything longer is almost certainly the model mis-selecting.
const MAX_HIGHLIGHT_CHARS = 90;
const MAX_HIGHLIGHT_WORDS = 14;

/**
 * Defensive cleanup of a model answer before a highlight is applied:
 *  - drops any standalone line that narrates the highlight machinery
 *    ("A afirmação-chave é: ...", "Frase-chave: ...", "key claim is: ...");
 *  - unwraps any stray `==...==` the model emitted despite being told not to.
 *
 * This is a backstop: with structured output the model should never produce
 * either, but a medical answer must not leak internal plumbing if it does.
 */
export function stripHighlightLeak(answer: string): string {
  return answer
    .split(/\n+/)
    .filter((line) => {
      const s = line.trim();
      return (
        !/^(?:a\s+)?(?:afirma[cç][aã]o|frase|express[aã]o|trecho)[-\s]?chave\s*(?:é|:)/i.test(
          s,
        ) && !/^key claim\s*(?:is|:)/i.test(s)
      );
    })
    .join("\n")
    .replace(/==([^=\n]+)==/g, "$1")
    .trim();
}

/**
 * Find the innermost `**bold**` span that fully encloses [start, end), if any.
 *
 * A highlight inserted inside a bold span (`**a ==b== c**`) would be swallowed by
 * formatMessage's bold matcher and rendered as raw `==` text, so the caller pulls
 * the phrase out of bold when this returns a span.
 */
export function findEnclosingBold(
  text: string,
  start: number,
  end: number,
): { start: number; end: number; innerStart: number; innerEnd: number } | null {
  const boldPattern = /\*\*([\s\S]+?)\*\*/g;
  let m: RegExpExecArray | null;
  while ((m = boldPattern.exec(text)) !== null) {
    const innerStart = m.index + 2;
    const innerEnd = m.index + m[0].length - 2;
    if (start >= innerStart && end <= innerEnd) {
      return { start: m.index, end: m.index + m[0].length, innerStart, innerEnd };
    }
  }
  return null;
}

/**
 * Produce the final answer string with at most one `==...==` highlight.
 *
 * The highlight is applied only when `phrase` is a short, verbatim, and unique
 * substring of the (cleaned) answer; otherwise the answer is returned with no
 * highlight. When the phrase falls inside a `**bold**` span it is pulled out so
 * the resulting `<mark>` actually renders.
 */
export function highlightKeyClaim(
  answer: string,
  phrase: string | null,
): string {
  const clean = stripHighlightLeak(answer);
  const p = phrase?.trim().replace(/==/g, "") ?? "";

  // Reject empty, overlong, or sentence-length "phrases".
  if (!p || p.length > MAX_HIGHLIGHT_CHARS) return clean;
  if (p.split(/\s+/).length > MAX_HIGHLIGHT_WORDS) return clean;

  const first = clean.indexOf(p);
  if (first === -1) return clean; // not verbatim — never invent a highlight
  const second = clean.indexOf(p, first + p.length);
  if (second !== -1) return clean; // ambiguous (appears twice) — prefer none
  const end = first + p.length;

  const bold = findEnclosingBold(clean, first, end);
  if (!bold) {
    return clean.slice(0, first) + `==${p}==` + clean.slice(end);
  }

  // Phrase sits inside a **bold** span — rebuild as **pre** ==phrase== **post**,
  // dropping empty bold remnants and preserving the original spacing.
  const pre = clean.slice(bold.innerStart, first);
  const post = clean.slice(end, bold.innerEnd);
  const preBold = pre.replace(/\s+$/, "");
  const preSpace = pre.slice(preBold.length);
  const postBold = post.replace(/^\s+/, "");
  const postSpace = post.slice(0, post.length - postBold.length);
  const rebuilt =
    (preBold ? `**${preBold}**` : "") +
    preSpace +
    `==${p}==` +
    postSpace +
    (postBold ? `**${postBold}**` : "");
  return clean.slice(0, bold.start) + rebuilt + clean.slice(bold.end);
}
