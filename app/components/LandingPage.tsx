import { Wordmark } from "./ui/Wordmark";
import { Icon } from "./ui/Icon";

interface LandingPageProps {
  onScanMedicine: () => void;
  onManualEntry: () => void;
}

const LandingPage = ({ onScanMedicine, onManualEntry }: LandingPageProps) => {
  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between p-5 lg:px-12">
        <Wordmark />
        <span className="text-[11px] uppercase tracking-[0.12em] text-muted font-medium">
          Beta
        </span>
      </div>

      {/* Hero block — vertically centered. Single column on mobile; on desktop a
          balanced two-column editorial hero (text left, actions right). */}
      <div className="flex-1 flex flex-col justify-center px-6 lg:px-12">
        <div className="w-full max-w-md lg:max-w-5xl lg:mx-auto lg:grid lg:grid-cols-12 lg:gap-x-16 lg:items-center">
          {/* Text column */}
          <div className="lg:col-span-7">
            <p className="text-[11px] uppercase tracking-[0.12em] text-brand font-medium mb-3">
              Sem opiniões. Sem suposições.
            </p>
            <h1 className="font-serif text-[40px] lg:text-[56px] leading-[1.05] tracking-[-0.02em] [text-wrap:pretty] text-ink m-0">
              Informação clara sobre o seu medicamento.
            </h1>
            <p className="text-[15px] lg:text-[17px] text-ink-2 mt-4 lg:mt-6 leading-relaxed max-w-[320px] lg:max-w-[440px]">
              Em vez de procurar no Google, pergunte ao folheto informativo.
            </p>
          </div>

          {/* Actions column */}
          <div className="flex flex-col gap-3 mt-8 lg:mt-0 lg:col-span-5">
            {/* Primary CTA — Fotografar caixa */}
            <button
              type="button"
              onClick={onScanMedicine}
              className="flex items-center gap-3 w-full rounded-lg bg-brand text-white p-4 min-h-[64px] text-left transition-colors hover:bg-brand-deep"
            >
              <Icon.camera className="w-5 h-5 flex-shrink-0" />
              <div className="flex flex-col flex-1 text-left">
                <span className="text-[15px] font-medium leading-tight">
                  Fotografar caixa
                </span>
                <span className="text-[12px] opacity-60 mt-0.5">
                  Aponte à embalagem
                </span>
              </div>
              <Icon.arrow className="w-4 h-4 flex-shrink-0 opacity-50" />
            </button>

            {/* Secondary CTA — Procurar pelo nome */}
            <button
              type="button"
              onClick={onManualEntry}
              className="flex items-center gap-3 w-full rounded-lg bg-paper text-ink border border-border p-4 min-h-[64px] text-left transition-colors hover:bg-tint"
            >
              <Icon.search className="w-5 h-5 flex-shrink-0 text-ink-2" />
              <div className="flex flex-col flex-1 text-left">
                <span className="text-[15px] font-medium leading-tight">
                  Procurar pelo nome
                </span>
                <span className="text-[12px] text-muted mt-0.5">
                  Nome, substância ou dosagem
                </span>
              </div>
              <Icon.chevron className="w-4 h-4 flex-shrink-0 text-muted" />
            </button>
          </div>
        </div>
      </div>

      {/* Footer disclaimer */}
      <div className="px-6 lg:px-12 py-5 border-t border-rule mt-4">
        <p className="text-[11px] text-muted leading-relaxed">
          O Medabot ajuda a perceber o folheto. Não substitui o aconselhamento do seu médico ou farmacêutico.
        </p>
      </div>
    </div>
  );
};

export default LandingPage;
