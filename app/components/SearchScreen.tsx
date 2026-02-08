import { useState } from "react";
import { IdentifyMedicineResponse } from "../core/identify";
import { parseSearchInput } from "../server/parseSearchInput";
import Button from "./ui/Button";

interface SearchScreenProps {
  onSubmit: (data: IdentifyMedicineResponse) => void;
  onCancel: () => void;
  onAdvancedSearch: () => void;
}

const SearchScreen = ({ onSubmit, onCancel, onAdvancedSearch }: SearchScreenProps) => {
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
    <div className="min-h-screen bg-mesh-landing flex flex-col relative overflow-hidden">
      {/* Decorative floating orbs */}
      <div className="absolute top-20 left-6 w-36 h-36 rounded-full bg-primary-400/8 blur-3xl animate-float" />
      <div className="absolute bottom-40 right-8 w-28 h-28 rounded-full bg-accent-400/10 blur-2xl animate-float stagger-3" />

      <div className="flex-1 flex flex-col px-7 pt-14 pb-10 relative z-10 md:items-center md:justify-center md:pt-0">
        {/* Back button */}
        <div className="animate-stagger-in stagger-1 md:absolute md:top-6 md:left-8">
          <button
            onClick={onCancel}
            className="min-h-[44px] min-w-[44px] flex items-center gap-2 text-gray-400 hover:text-gray-700 transition-colors mb-8 md:mb-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            <span className="text-sm font-medium">Voltar</span>
          </button>
        </div>

        {/* Title section */}
        <div className="mb-8 animate-stagger-in stagger-2 md:text-center">
          <h2 className="text-[1.75rem] font-800 text-gray-900 tracking-tight leading-none mb-2">
            Pesquisar <span className="text-primary-600">medicamento</span>
          </h2>
          <p className="text-[15px] text-gray-400 font-light leading-relaxed">
            Escreva o nome, substância ou dosagem
          </p>
        </div>

        {/* Search content */}
        <div className="w-full max-w-md md:max-w-lg animate-stagger-in stagger-3">
          {/* Search input with glass effect */}
          <div className="flex gap-2.5 mb-5">
            <div className="flex-1 glass rounded-2xl ring-1 ring-gray-200/60 shadow-sm focus-within:ring-2 focus-within:ring-primary-500 focus-within:shadow-md transition-all">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Ex: Paracetamol 500mg, Ben-u-ron..."
                className="w-full min-h-[52px] px-5 text-[15px] bg-transparent border-none focus:outline-none placeholder:text-gray-300"
                autoFocus
                disabled={parsing}
              />
            </div>
            <Button onClick={handleSearch} disabled={!query.trim() || parsing} className="!rounded-2xl !px-4 !min-h-[52px] shadow-lg shadow-primary-600/25">
              {parsing ? (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white" />
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                </svg>
              )}
            </Button>
          </div>

          <button
            onClick={onAdvancedSearch}
            className="text-[13px] text-primary-600 hover:text-primary-700 font-medium transition-colors md:w-full md:text-center"
          >
            Pesquisa avançada (formulário completo)
          </button>

          {/* Search hints */}
          <div className="mt-10 space-y-3 animate-stagger-in stagger-4 md:text-center">
            <p className="text-[11px] font-medium text-gray-300 uppercase tracking-widest">Exemplos de pesquisa</p>
            <div className="flex flex-wrap gap-2 md:justify-center">
              {["Ben-u-ron 1mg", "Brufen 600mg"].map((hint) => (
                <button
                  key={hint}
                  onClick={() => setQuery(hint)}
                  className="px-3.5 py-2 text-[13px] text-gray-500 glass rounded-xl ring-1 ring-gray-200/60 hover:bg-white/80 hover:text-gray-700 transition-all"
                >
                  {hint}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchScreen;
