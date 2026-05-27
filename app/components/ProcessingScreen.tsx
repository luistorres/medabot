import { IdentifyMedicineResponse } from "../core/identify";
import Button from "./ui/Button";
import { Wordmark } from "./ui/Wordmark";
import { Icon } from "./ui/Icon";
import { classifyProcessingError } from "../utils/classifyProcessingError";

interface Step {
  id: string;
  label: string;
  icon: React.ReactNode;
}

interface ProcessingScreenProps {
  steps: Step[];
  currentStep: string;
  completedSteps: string[];
  medicineInfo: IdentifyMedicineResponse | null;
  processingError: string;
  failedStep: string;
  loading: boolean;
  searchMessage: string;
  onRetryStep: (stepId: string) => void;
  onGoToCamera: () => void;
  onGoToManualForm: () => void;
  onReset: () => void;
}

// ─── StepDot ────────────────────────────────────────────────
type StepState = "done" | "active" | "pending" | "failed";

function StepDot({ state }: { state: StepState }) {
  if (state === "done") {
    return (
      <span className="w-[22px] h-[22px] rounded-full bg-brand flex items-center justify-center flex-shrink-0">
        <Icon.check className="w-3 h-3 text-white" />
      </span>
    );
  }
  if (state === "active") {
    return (
      <span className="w-[22px] h-[22px] rounded-full border-2 border-brand flex items-center justify-center flex-shrink-0">
        <span className="w-2 h-2 rounded-full bg-brand animate-pulse-dot" />
      </span>
    );
  }
  if (state === "failed") {
    return (
      <span className="w-[22px] h-[22px] rounded-full bg-error flex items-center justify-center flex-shrink-0">
        <Icon.close className="w-3 h-3 text-white" />
      </span>
    );
  }
  // pending
  return (
    <span className="w-[22px] h-[22px] rounded-full border-2 border-dashed border-faint flex-shrink-0" />
  );
}

// ─── Row definitions: 5 step ids → 4 visual rows ────────────
interface RowDef {
  /** Primary step id for this row (used for active/failed matching) */
  id: string;
  /** Extra ids that count as "this row" (for row 4: overview+ready) */
  extraIds?: string[];
  label: string;
}

const ROW_DEFS: RowDef[] = [
  { id: "identify", label: "A identificar o medicamento" },
  { id: "fetch",    label: "A obter o folheto oficial" },
  { id: "process",  label: "A ler o folheto" },
  { id: "overview", extraIds: ["ready"], label: "A preparar o resumo" },
];

function getRowState(
  row: RowDef,
  currentStep: string,
  completedSteps: string[],
  failedStep: string,
): StepState {
  const allIds = [row.id, ...(row.extraIds ?? [])];

  // failed: failedStep is one of this row's ids
  if (allIds.includes(failedStep)) return "failed";

  // done: for row 4, done only when `ready` is in completedSteps;
  //       for others, done when primary id is completed
  if (row.id === "overview") {
    if (completedSteps.includes("ready")) return "done";
  } else {
    if (completedSteps.includes(row.id)) return "done";
  }

  // active: currentStep is any of this row's ids
  if (allIds.includes(currentStep)) return "active";

  return "pending";
}

// ─── ProcessingScreen ────────────────────────────────────────
const ProcessingScreen = ({
  steps: _steps,
  currentStep,
  completedSteps,
  medicineInfo,
  processingError,
  failedStep,
  loading: _loading,
  searchMessage: _searchMessage,
  onRetryStep,
  onGoToCamera,
  onGoToManualForm,
  onReset,
}: ProcessingScreenProps) => {
  const classified = processingError ? classifyProcessingError(processingError) : null;

  const subtitle = [
    medicineInfo?.activeSubstance,
    medicineInfo?.dosage,
    medicineInfo?.pharmaceuticalForm,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* ── Header ── */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-rule">
        <button
          onClick={onReset}
          className="text-ink-2 flex items-center"
          aria-label="Fechar"
        >
          <Icon.close className="w-[18px] h-[18px]" />
        </button>
        <Wordmark size={14} />
        {/* spacer to balance the close icon */}
        <span className="w-[18px]" />
      </header>

      {/* ── Body ── */}
      <div className="flex flex-col flex-1 px-6 overflow-y-auto">
        {/* Title block */}
        <div className="pt-7 pb-2">
          <p className="text-[11px] uppercase tracking-[0.12em] text-brand mb-2.5">
            A Processar
          </p>
          <h1 className="font-serif text-[28px] font-normal leading-[1.1] tracking-[-0.015em] text-ink m-0">
            A ler o folheto.<br />Demora uns segundos.
          </h1>
        </div>

        {/* Identified-medicine card */}
        {medicineInfo?.name && (
          <div className="mt-5 bg-paper rounded-xl p-4 flex gap-4 border border-border">
            {/* Box silhouette */}
            <div className="w-16 h-20 rounded-[6px] bg-gradient-to-b from-[#FBFBFB] to-[#F0EDE6] border border-border flex-shrink-0 flex flex-col pt-[6px] px-[6px]">
              <div className="w-[28px] h-[3px] bg-brand rounded-sm mb-1" />
            </div>
            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-[11px] uppercase tracking-[0.12em] text-brand mb-1">
                Identificado
              </p>
              <h3 className="font-serif text-[18px] font-[500] leading-tight tracking-[-0.005em] text-ink m-0">
                {medicineInfo.name}
              </h3>
              {subtitle && (
                <p className="font-mono text-[12px] text-muted mt-0.5 m-0">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Steps list */}
        <div className="mt-3 flex flex-col">
          {ROW_DEFS.map((row) => {
            const state = getRowState(row, currentStep, completedSteps, failedStep);
            const isPending = state === "pending";

            return (
              <div
                key={row.id}
                className="border-b border-rule py-3.5 flex items-center gap-3"
              >
                <StepDot state={state} />
                <span
                  className={`text-[14px] flex-1 ${isPending ? "text-muted" : "text-ink"}`}
                >
                  {row.label}
                </span>
                {state === "active" && (
                  <span className="font-mono text-[11px] text-brand">
                    em curso
                  </span>
                )}
                {state === "done" && (
                  <Icon.check className="text-brand w-3 h-3" />
                )}
              </div>
            );
          })}
        </div>

        {/* Error recovery block */}
        {classified && failedStep && (
          <div className="mt-5 flex flex-col gap-3">
            {/* Error message */}
            <p className="text-[14px] text-error m-0">
              {classified.message}
            </p>

            {/* Primary action */}
            {classified.primaryAction === "retry" && (
              <Button fullWidth onClick={() => onRetryStep(failedStep)}>
                Tentar novamente
              </Button>
            )}
            {classified.primaryAction === "search" && (
              <Button fullWidth onClick={onGoToManualForm}>
                Procurar pelo nome
              </Button>
            )}

            {/* Secondary actions */}
            <div className="flex flex-col gap-2">
              {/* Show retry as secondary if primary was search */}
              {classified.primaryAction !== "retry" && (
                <Button variant="secondary" fullWidth onClick={() => onRetryStep(failedStep)}>
                  Tentar novamente
                </Button>
              )}

              {/* Camera always available */}
              <Button variant="secondary" fullWidth onClick={onGoToCamera}>
                Fotografar
              </Button>

              {/* Show search as secondary if primary was retry */}
              {classified.primaryAction === "retry" && (
                <Button variant="secondary" fullWidth onClick={onGoToManualForm}>
                  Procurar pelo nome
                </Button>
              )}

              {/* Always present reset link */}
              <Button variant="link" onClick={onReset}>
                Recomeçar
              </Button>
            </div>
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Footer caption */}
        <p className="text-center text-muted text-[13px] mt-6 mb-6">
          As respostas aparecem em segundos. Não saímos do folheto oficial.
        </p>
      </div>
    </div>
  );
};

export default ProcessingScreen;
