import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import { openai } from "./llm";
import { highlightKeyClaim } from "./highlight";
import { resolveSourceQuote } from "./sourceQuote";
import {
  LeafletDoc,
  assembleLeafletContext,
  validateCitedPages,
  pageParagraphs,
} from "./leafletStore";
import { stripInlinePageRefs } from "../utils/stripInlinePageRefs";

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

const MAX_HISTORY_TURNS = 16;
const MAX_TURN_CHARS = 4000;

/**
 * Server-side hardening of client-supplied history: keep only user/assistant
 * string turns, strip highlight markers, cap each turn's length and the number
 * of turns. Prevents role injection (e.g. a client-sent "system" turn) and
 * unbounded token growth.
 */
export function sanitizeHistory(history: ChatTurn[] | undefined | null): ChatTurn[] {
  return (Array.isArray(history) ? history : [])
    .filter(
      (t): t is ChatTurn =>
        !!t && (t.role === "user" || t.role === "assistant") && typeof t.content === "string",
    )
    .map((t) => ({ role: t.role, content: t.content.replace(/==/g, "").slice(0, MAX_TURN_CHARS) }))
    .slice(-MAX_HISTORY_TURNS);
}

const LeafletAnswerSchema = z.object({
  answer: z.string(),
  citedPages: z.array(z.number()),
  highlightPhrase: z.string().nullable(),
  quoteStart: z.string().nullable(),
  quoteEnd: z.string().nullable(),
});

const CHAT_SYSTEM_PROMPT = `Você é o assistente do Medabot. Responde a perguntas de pacientes usando APENAS o folheto informativo fornecido.

Como responder:
- Escreve em português de Portugal (pt-PT), de forma natural, clara e direta, como um farmacêutico a explicar a um paciente. Frases curtas.
- NÃO menciones números de página no texto da resposta — as páginas são tratadas à parte.
- Responde apenas com base no folheto. Não inventes nem infiras informação que não conste do folheto.
- Se a informação não estiver no folheto, responde exatamente: "Não encontro essa informação no folheto informativo. Recomendo consultar um profissional de saúde."
- Só sugiras consultar um profissional de saúde quando (a) a resposta não estiver no folheto, ou (b) o próprio folheto o aconselhar para esse assunto. Caso contrário, não o faças.
- Tem em conta as mensagens anteriores ao responder a perguntas de seguimento.

Campos estruturados a devolver:
- answer: a resposta em pt-PT, sem números de página e sem recomendações automáticas de médico.
- citedPages: lista dos números de página que efetivamente usaste para responder (apenas esses). [] se a resposta não estiver no folheto.
- highlightPhrase: opcionalmente UMA expressão curta que apareça LITERALMENTE na resposta e responda diretamente à pergunta; caso contrário null. Sem rótulos e sem marcação ==...==.
- quoteStart / quoteEnd: para localizar no folheto o trecho que fundamenta a resposta, escolhe UM trecho CURTO (idealmente uma única frase, menos de ~40 palavras) e devolve as primeiras ~5-6 palavras (quoteStart) e as últimas ~5-6 palavras (quoteEnd) desse MESMO trecho contíguo, copiadas VERBATIM do folheto (não da tua resposta). Não incluas "[Página X]". Usa null em ambos se nenhum trecho curto e único fundamentar a resposta.`;

/**
 * Whole-leaflet, multi-turn chat. The full page-tagged leaflet sits in a stable
 * cached system message; conversation history accumulates after it; the latest
 * question is appended last. Citations come from structured output, validated and
 * reconciled with the verbatim-quote page. Throws on an empty parse so the server
 * surfaces the retryable error bubble (never a silent "Sem resposta.").
 */
export async function queryLeaflet(
  doc: LeafletDoc,
  history: ChatTurn[],
  question: string,
  medicineName: string,
  pdfHash: string,
) {
  try {
    const context = assembleLeafletContext(doc.pages);
    const safeHistory = sanitizeHistory(history);

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: CHAT_SYSTEM_PROMPT },
      {
        role: "system",
        content: `Folheto informativo de ${medicineName || "este medicamento"}:\n\n${context}`,
      },
      ...safeHistory.map((t) => ({ role: t.role, content: t.content })),
      { role: "user", content: question },
    ];

    const response = await openai.chat.completions.parse({
      model: "gpt-5.4",
      reasoning_effort: "low",
      response_format: zodResponseFormat(LeafletAnswerSchema, "leaflet_answer"),
      max_completion_tokens: 4000,
      prompt_cache_key: pdfHash, // per-medicine prefix sharing across users/turns
      messages,
    });

    const parsed = response.choices[0]?.message?.parsed;
    if (!parsed) {
      console.warn(
        `queryLeaflet: structured parse returned null (finish_reason=${response.choices[0]?.finish_reason})`,
      );
      throw new Error("Empty structured answer from model");
    }

    // Strip leaked page refs BEFORE highlighting so a removed leading citation
    // can't leave the highlight phrase stranded at a lowercase sentence start.
    const answer = highlightKeyClaim(stripInlinePageRefs(parsed.answer), parsed.highlightPhrase);

    const sourceQuote = resolveSourceQuote(
      parsed.quoteStart ?? null,
      parsed.quoteEnd ?? null,
      doc.pages,
    );

    const pageNumbers = validateCitedPages(parsed.citedPages, doc.totalPages, sourceQuote?.page ?? null);

    // Fallback wash targets for the PDF viewer: paragraphs of the cited pages.
    const sources = pageNumbers.flatMap((p) => {
      const page = doc.pages.find((pg) => pg.page === p);
      return page ? pageParagraphs(page.text).map((text) => ({ page: p, text })) : [];
    });

    return {
      answer,
      sourceQuote: sourceQuote?.quote ?? null,
      sourceQuotePage: sourceQuote?.page ?? null,
      sources,
      pageNumbers,
      relevantPages: pageNumbers,
    };
  } catch (error) {
    console.error("Error querying leaflet:", error);
    throw error;
  }
}
