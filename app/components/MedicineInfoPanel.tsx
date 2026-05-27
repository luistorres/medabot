import { IdentifyMedicineResponse } from "../core/identify";
import { usePDF } from "../context/PDFContext";
import type { MedicineSummary } from "../server/extractMedicineSummary";
import { isNotFoundAnswer } from "../utils/isNotFoundAnswer";
import Button from "./ui/Button";
import { Wordmark } from "./ui/Wordmark";
import { Icon } from "./ui/Icon";
import { SourceBadge } from "./ui/SourceBadge";
import { MetaRow } from "./ui/MetaRow";

interface MedicineInfoPanelProps {
  medicineInfo: IdentifyMedicineResponse;
  image: string | null;
  pdfData: string | null;
  summary?: MedicineSummary | null;
  onReset: () => void;
  onDownloadPdf: () => void;
  onForceRefresh: () => void;
  overview?: string;
}

const IMPORTANTE_KEYWORDS = [
  "dose",
  "máxim",
  "maxim",
  "álcool",
  "alcool",
  "interaç",
  "interac",
];

function extractImportanteSentences(text: string): string {
  // Split on ". " or newlines to get sentences
  const raw = text.split(/\.\s+|\n+/);
  const lower = text.toLowerCase();
  // Quick guard — if none of the keywords appear anywhere, skip the expensive loop
  const hasAny = IMPORTANTE_KEYWORDS.some((kw) => lower.includes(kw));
  if (!hasAny) return "";

  const matched: string[] = [];
  for (const sentence of raw) {
    const s = sentence.trim();
    if (!s) continue;
    const sl = s.toLowerCase();
    if (IMPORTANTE_KEYWORDS.some((kw) => sl.includes(kw))) {
      matched.push(s);
      if (matched.length >= 2) break;
    }
  }
  return matched.join(". ");
}

const MedicineInfoPanel = ({
  medicineInfo,
  image,
  pdfData,
  summary,
  onReset,
  onDownloadPdf,
  onForceRefresh,
  overview,
}: MedicineInfoPanelProps) => {
  const { setIsPdfViewerOpen, setActiveTab } = usePDF();

  const handleViewPdf = () => {
    setIsPdfViewerOpen(true);
    setActiveTab("pdf");
  };

  // Mono subtitle — dosage · pharmaceuticalForm (omit blanks)
  const monoSubtitle = [medicineInfo.dosage, medicineInfo.pharmaceuticalForm]
    .filter(Boolean)
    .join(" · ");

  // MetaRow items — omit items with empty/undefined values
  const metaItems = [
    { label: "SUBSTÂNCIA", value: medicineInfo.activeSubstance, serif: true as const },
    { label: "FORMA", value: medicineInfo.pharmaceuticalForm },
    { label: "TITULAR", value: medicineInfo.titular },
  ].filter((item): item is { label: string; value: string; serif?: true } =>
    Boolean(item.value)
  );

  // Importante saber callout — only when overview present, not a "not found" answer,
  // and at least one sentence matches a safety keyword
  const importanteText =
    overview && !isNotFoundAnswer(overview)
      ? extractImportanteSentences(overview)
      : "";
  const showImportante = importanteText.length > 0;

  return (
    <div className="bg-bg h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-rule flex-shrink-0">
        <button
          onClick={onReset}
          className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-ink-2 hover:bg-tint transition-colors"
          aria-label="Voltar"
        >
          <Icon.back className="w-5 h-5" />
        </button>
        <Wordmark size={16} />
        <SourceBadge medicine={medicineInfo.name} />
      </div>

      {/* Scrollable content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {/* Hero block */}
        <div className="p-6 pb-5">
          {summary?.category && (
            <p className="text-[11px] uppercase tracking-widest text-brand font-medium mb-2">
              {summary.category}
            </p>
          )}
          <h1
            className="font-serif text-[34px] leading-[1.05] tracking-[-0.02em] text-ink font-normal mb-1"
          >
            {medicineInfo.name}
          </h1>
          {monoSubtitle && (
            <p className="font-mono text-[15px] tracking-[-0.01em] text-muted">
              {monoSubtitle}
            </p>
          )}
        </div>

        {/* Identity card */}
        <div className="px-6 pb-6">
          <div className="bg-paper rounded-xl border border-border p-4 flex gap-4 items-start">
            {/* Box silhouette — photo or CSS placeholder */}
            {image ? (
              <img
                src={image}
                alt="Medicamento capturado"
                className="rounded-[6px] ring-1 ring-border object-cover flex-shrink-0"
                style={{ width: 74, height: 92 }}
              />
            ) : (
              <div
                className="rounded-[6px] bg-gradient-to-b from-[#FBFBFB] to-[#F0EDE6] border border-border flex flex-col justify-between p-2 flex-shrink-0"
                style={{ width: 74, height: 92 }}
              >
                <div>
                  <div className="bg-brand mb-1" style={{ width: 28, height: 3 }} />
                  <p className="font-serif text-[10px] text-ink leading-tight">
                    {medicineInfo.name}
                  </p>
                  {medicineInfo.dosage && (
                    <p className="font-mono text-[7px] text-ink-2 mt-0.5">
                      {medicineInfo.dosage}
                    </p>
                  )}
                </div>
                <p className="text-[6px] uppercase tracking-[0.05em] text-muted">
                  20 COMP.
                </p>
              </div>
            )}

            {/* Meta key-value rows */}
            <div className="flex-1 min-w-0">
              {metaItems.length > 0 ? (
                <MetaRow items={metaItems} />
              ) : (
                <p className="text-[13px] text-muted">—</p>
              )}
            </div>
          </div>
        </div>

        {/* Para que serve */}
        {summary && summary.indications.length > 0 && (
          <div className="px-6 pb-6">
            <p className="text-[11px] uppercase tracking-widest text-brand font-medium mb-3">
              Para que serve
            </p>
            <ul className="flex flex-col gap-2">
              {summary.indications.map((indication, i) => (
                <li key={i} className="flex gap-3 items-baseline text-[14px] text-ink leading-snug">
                  <span className="font-mono text-[11px] text-muted flex-shrink-0 min-w-[18px]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span>{indication}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Importante saber callout */}
        {showImportante && (
          <div className="px-6 pb-6">
            <div className="bg-accent-soft border-l-2 border-accent rounded-r-lg p-4">
              <p className="text-[11px] uppercase tracking-widest text-accent-ink font-medium mb-2">
                Importante saber
              </p>
              <p className="text-[13.5px] leading-[1.5] text-accent-ink">
                {importanteText}.{" "}
                <Button
                  variant="link"
                  onClick={handleViewPdf}
                  className="text-[13.5px] text-accent-ink underline decoration-accent-ink/40 hover:decoration-accent-ink"
                >
                  Ver mais no folheto →
                </Button>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Pinned action stack */}
      <div className="flex-shrink-0 border-t border-rule bg-bg px-4 pt-3.5 pb-4">
        {pdfData ? (
          <>
            <Button variant="primary" fullWidth onClick={handleViewPdf}>
              <Icon.doc className="w-4 h-4" />
              Abrir folheto
            </Button>
            <div className="flex items-center justify-center gap-4 mt-3">
              <button
                onClick={onDownloadPdf}
                className="inline-flex items-center gap-1.5 text-[12px] text-ink-2 hover:text-ink transition-colors"
              >
                <Icon.download className="w-3.5 h-3.5" />
                Guardar PDF
              </button>
              <span className="text-faint select-none">·</span>
              <button
                onClick={onForceRefresh}
                className="inline-flex items-center gap-1.5 text-[12px] text-ink-2 hover:text-ink transition-colors"
              >
                <Icon.refresh className="w-3.5 h-3.5" />
                Procurar novamente
              </button>
            </div>
          </>
        ) : (
          <Button variant="secondary" fullWidth onClick={onReset}>
            <Icon.back className="w-4 h-4" />
            Voltar ao início
          </Button>
        )}

        {/* Disclaimer */}
        <p className="text-[11px] text-muted text-center leading-snug mt-3">
          O Medabot ajuda a perceber o folheto. Não substitui o aconselhamento do seu médico ou farmacêutico.
        </p>
      </div>
    </div>
  );
};

export default MedicineInfoPanel;
