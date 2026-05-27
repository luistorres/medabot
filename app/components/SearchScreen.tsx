import { useState } from "react";
import { IdentifyMedicineResponse } from "../core/identify";
import { parseSearchInput } from "../server/parseSearchInput";
import Button from "./ui/Button";
import { Wordmark } from "./ui/Wordmark";
import { Icon } from "./ui/Icon";

interface SearchScreenProps {
  onSubmit: (data: IdentifyMedicineResponse) => void;
  onCancel: () => void;
  onAdvancedSearch: () => void;
  onOpenCamera?: () => void;
}

const EXAMPLES = [
  { name: "Ben-U-Ron 1000 mg", sub: "Paracetamol" },
  { name: "Brufen 600 mg", sub: "Ibuprofeno" },
  { name: "Aspirina 500 mg", sub: "Ácido acetilsalicílico" },
  { name: "Voltaren Emulgel", sub: "Diclofenac" },
];

const SearchScreen = ({
  onSubmit,
  onCancel,
  onAdvancedSearch,
  onOpenCamera,
}: SearchScreenProps) => {
  const [query, setQuery] = useState("");
  const [parsing, setParsing] = useState(false);

  const handleSearch = async () => {
    if (!query.trim() || parsing) return;

    setParsing(true);
    try {
      const result = await parseSearchInput({ data: query.trim() });
      onSubmit(result);
    } catch {
      // Fallback: use query as name
      onSubmit({
        name: query.trim(),
        activeSubstance: "",
        dosage: "",
        brand: "",
      });
    } finally {
      setParsing(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Mobile header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-rule">
        <button
          onClick={onCancel}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center text-ink-2 hover:text-ink transition-colors"
          aria-label="Voltar"
        >
          <Icon.back className="w-5 h-5" />
        </button>
        <Wordmark size={16} />
        {/* Spacer to balance the header */}
        <span className="w-[44px]" />
      </header>

      {/* Hero block */}
      <div className="px-6 pt-7 pb-4">
        <p className="text-[11px] uppercase tracking-[0.12em] text-brand font-medium mb-2.5">
          PROCURAR
        </p>
        <h1
          className="font-serif text-[32px] font-normal leading-[1.05] tracking-[-0.02em] text-ink mb-2"
          style={{ textWrap: "pretty" } as React.CSSProperties}
        >
          Que medicamento quer consultar?
        </h1>
        <p className="text-[14px] leading-[1.5] text-ink-2">
          Escreva o nome, a substância ativa ou a dosagem. Combine para
          resultados mais precisos.
        </p>
      </div>

      {/* Search input */}
      <div className="px-6 pt-2 pb-4">
        <div className="flex items-center gap-2.5 bg-paper border border-ink rounded-lg px-[14px] py-[10px] focus-within:ring-2 focus-within:ring-brand/30 transition-shadow">
          <Icon.search className="w-[18px] h-[18px] text-ink-2 flex-shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Ben-u-ron 500 mg"
            className="flex-1 text-[15px] text-ink bg-transparent border-none outline-none placeholder:text-muted py-1 min-h-0"
            autoFocus
            disabled={parsing}
          />
          {parsing ? (
            <div className="w-4 h-4 rounded-full border-2 border-brand/30 border-t-brand animate-spin flex-shrink-0" />
          ) : (
            <button
              type="button"
              onClick={handleSearch}
              disabled={parsing || !query.trim()}
              className="flex items-center justify-center min-w-[40px] min-h-[40px] -mr-2 rounded-lg bg-brand text-white hover:bg-brand-deep disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
              aria-label="Procurar"
            >
              <Icon.arrow className="w-[18px] h-[18px]" />
            </button>
          )}
        </div>

        <div className="mt-2.5">
          <button
            onClick={onAdvancedSearch}
            className="text-[12.5px] text-ink-2 underline underline-offset-[3px] decoration-faint hover:decoration-ink-2 hover:text-ink transition-colors"
          >
            Procurar com mais detalhe →
          </button>
        </div>
      </div>

      {/* Examples section */}
      <div className="px-6 pt-3 pb-4 border-t border-rule">
        <p className="text-[11px] uppercase tracking-[0.12em] text-muted font-medium mb-3">
          TENTE, POR EXEMPLO
        </p>
        <div className="flex flex-col">
          {EXAMPLES.map((ex, i) => (
            <button
              key={ex.name}
              onClick={() => setQuery(ex.name)}
              className={
                "w-full flex justify-between items-center py-3 text-left border-b border-rule hover:bg-tint transition-colors -mx-2 px-2 rounded" +
                (i === 0 ? " border-t border-rule" : "")
              }
              disabled={parsing}
            >
              <div>
                <div className="font-serif text-[17px] font-medium text-ink tracking-[-0.005em] leading-snug">
                  {ex.name}
                </div>
                <div className="text-[12px] text-muted mt-0.5">{ex.sub}</div>
              </div>
              <Icon.chevron className="w-[14px] h-[14px] text-faint flex-shrink-0 ml-3" />
            </button>
          ))}
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Camera hint card (always rendered) */}
      <div className="px-6 pb-6 pt-4 border-t border-rule">
        <div className="flex items-center gap-3 bg-surface border border-border rounded-lg p-4">
          <Icon.camera className="w-5 h-5 text-brand flex-shrink-0" />
          <span className="flex-1 text-[14px] font-medium text-ink">
            Tem a caixa em mãos?
          </span>
          <Button
            variant="link"
            size="sm"
            onClick={() => onOpenCamera?.()}
            className="text-[14px] font-medium"
          >
            Fotografar
          </Button>
          <Icon.arrow className="w-[14px] h-[14px] text-faint flex-shrink-0" />
        </div>
      </div>
    </div>
  );
};

export default SearchScreen;
