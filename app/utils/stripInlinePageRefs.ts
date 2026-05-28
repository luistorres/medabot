/**
 * Backstop that removes page references the chat model may leak into prose despite
 * being told not to. This is the SOLE prose-cleaning mechanism (the old inline
 * chip renderer never actually ran on formatMessage output — see Task 4 Step 2),
 * so it errs toward catching common phrasings. Citations live only in the bottom
 * CitationRow.
 */
// A page-reference "noun": página(s)/pág./p., plus folha, secção, and English page.
const REF_NOUN = String.raw`(?:p(?:[áa]g(?:inas?)?)?\.?|folhas?|sec[çc][ãa]o|se[çc][ãa]o|pages?)`;
// Consume decimals (e.g. "secção 4.3") so a trailing-clause matcher can't strip
// only the integer part ("secção 4") and leave a mangled ".3" behind.
const REF_NUM = String.raw`\d+(?:[.,]\d+)?(?:\s*(?:[-–—]|e|a)\s*\d+(?:[.,]\d+)?)?`;

const PAREN_RE = new RegExp(
  String.raw`\s*\((?:ver\s+|consulte\s+|consultar\s+)?${REF_NOUN}\s*${REF_NUM}\s*\)`,
  "gi",
);
// Mid-sentence comma-wrapped ref: "A dose, na página 3, é..." -> "A dose é..."
const COMMA_WRAPPED_RE = new RegExp(
  String.raw`,\s*(?:na|da|no|nas|das|nos|à|às|a)?\s*${REF_NOUN}\s+${REF_NUM}\s*,`,
  "gi",
);
// Sentence-leading refs: "De acordo com a página 3, " / "Consulte a página 3 ..."
const LEADING_RE = new RegExp(
  String.raw`(^|[.!?]\s+)(?:de acordo com|conforme(?:\s+indicado)?|segundo|tal como(?:\s+indicado)?|consulte|consultar|ver|veja)\s+(?:a|na|no|nas|em|à)?\s*${REF_NOUN}\s+${REF_NUM}[,:]?\s*`,
  "gi",
);
// Sentence-initial bare prepositional ref: "Na página 3, ..." / "Nas páginas 3 e 4, ..."
const LEADING_BARE_RE = new RegExp(
  String.raw`(^|[.!?]\s+)(?:na|no|nas|nos|da|do|das|dos|à|às|em)\s+${REF_NOUN}\s+${REF_NUM}[,:]?\s*`,
  "gi",
);
// Sentence-initial subject ref: "A página 3 indica que ..." / "A secção 2 refere ..."
const LEADING_SUBJECT_RE = new RegExp(
  String.raw`(^|[.!?]\s+)(?:a|as|o|os)\s+${REF_NOUN}\s+${REF_NUM}\s+(?:indica|refere|diz|menciona|explica|descreve|recomenda|aconselha|informa)(?:\s+que)?\s*`,
  "gi",
);
// Trailing refs at end of a clause/sentence: "..., na página 3." / "... das páginas 3-4"
// The "." terminator must NOT be followed by a digit, otherwise REF_NUM backtracks
// to the integer of a decimal (e.g. "secção 4.3" → strips "secção 4", leaves ".3").
const TRAILING_RE = new RegExp(
  String.raw`[,;]?\s+(?:na|da|no|nas|das|nos|à|às)?\s*${REF_NOUN}\s+${REF_NUM}(?=[!?)\]]|$|\.(?!\d))`,
  "gi",
);

export function stripInlinePageRefs(text: string): string {
  let out = text
    .replace(PAREN_RE, "")
    .replace(COMMA_WRAPPED_RE, " ") // collapse "..., <ref>, ..." -> single space, cleaned below
    .replace(LEADING_RE, "$1")
    .replace(LEADING_BARE_RE, "$1")
    .replace(LEADING_SUBJECT_RE, "$1")
    .replace(TRAILING_RE, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([.!?,;])/g, "$1")
    .trim();

  // Re-capitalize a sentence start left lowercase by a leading-ref removal.
  out = out.replace(/(^|[.!?]\s+)(\p{Ll})/gu, (_m, p, c) => p + c.toUpperCase());
  return out;
}
