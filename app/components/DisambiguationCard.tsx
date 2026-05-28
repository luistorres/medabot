import Button from "./ui/Button";
import { Wordmark } from "./ui/Wordmark";
import { Icon } from "./ui/Icon";

export interface Candidate {
  name: string;
  activeSubstance: string;
  similarity: number;
  pharmaceuticalForm?: string;
  dosage?: string;
  titular?: string;
}

interface DisambiguationCardProps {
  candidates: Candidate[];
  onSelect: (candidate: Candidate) => void;
  onNoneMatch: () => void;
  onBack?: () => void;
}

interface CandidateCardProps {
  candidate: Candidate;
  onSelect: (candidate: Candidate) => void;
  isTop: boolean;
}

function CandidateCard({ candidate, onSelect, isTop }: CandidateCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(candidate)}
      className={[
        "w-full text-left p-4 rounded-xl border transition-colors",
        isTop
          ? "bg-brand-soft border-brand"
          : "bg-paper border-border hover:bg-tint",
      ].join(" ")}
    >
      {/* First line: name + dosage + chevron */}
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <div className="flex items-baseline gap-2.5 min-w-0">
          <span className="font-serif text-[19px] text-ink leading-snug">
            {candidate.name}
          </span>
          {candidate.dosage && (
            <span className="font-mono text-[13px] text-muted flex-shrink-0">
              {candidate.dosage}
            </span>
          )}
        </div>
        <Icon.chevron className="text-muted flex-shrink-0 w-4 h-4" />
      </div>

      {/* Labeled meta rows */}
      <div className="flex flex-col gap-1">
        <div className="flex gap-2">
          <span className="text-[11px] uppercase tracking-wider text-muted w-[80px] flex-shrink-0 leading-[1.6]">
            Substância
          </span>
          <span className="text-[13px] text-ink leading-[1.6]">
            {candidate.activeSubstance}
          </span>
        </div>
        {candidate.pharmaceuticalForm && (
          <div className="flex gap-2">
            <span className="text-[11px] uppercase tracking-wider text-muted w-[80px] flex-shrink-0 leading-[1.6]">
              Forma
            </span>
            <span className="text-[13px] text-ink leading-[1.6]">
              {candidate.pharmaceuticalForm}
            </span>
          </div>
        )}
        {candidate.titular && (
          <div className="flex gap-2">
            <span className="text-[11px] uppercase tracking-wider text-muted w-[80px] flex-shrink-0 leading-[1.6]">
              Titular
            </span>
            <span className="text-[13px] text-ink leading-[1.6] min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
              {candidate.titular}
            </span>
          </div>
        )}
      </div>
    </button>
  );
}

const DisambiguationCard = ({
  candidates,
  onSelect,
  onNoneMatch,
  onBack,
}: DisambiguationCardProps) => {
  // Sort by similarity descending — highest match first
  const sorted = [...candidates].sort((a, b) => b.similarity - a.similarity);
  const [topCandidate, ...otherCandidates] = sorted;

  return (
    <div className="flex flex-col min-h-0 bg-bg">
      {/* Header */}
      <div className="flex items-center justify-center px-5 py-3 border-b border-rule relative">
        {onBack && (
          <button
            onClick={onBack}
            aria-label="Início"
            className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center justify-center min-w-[40px] min-h-[40px] text-ink-2 hover:text-ink transition-colors"
          >
            <Icon.back className="w-[18px] h-[18px]" />
          </button>
        )}
        <Wordmark size={18} />
      </div>

      {/* Title block */}
      <div className="px-6 pt-6 pb-4 flex-shrink-0">
        <p className="text-[11px] uppercase tracking-wider text-brand font-medium mb-2.5">
          Confirmação necessária
        </p>
        <h1 className="font-serif text-[26px] text-ink leading-[1.15] tracking-[-0.01em] mb-2">
          Qual destes é o seu?
        </h1>
        <p className="text-[14px] text-ink-2 leading-[1.5]">
          Para mostrar o folheto certo, preciso de saber exatamente que
          medicamento tem em mãos. Compare com a sua caixa.
        </p>
      </div>

      {/* Candidate list */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 min-h-0">
        {/* Top candidate section */}
        {topCandidate && (
          <div className="mb-4">
            <p className="text-[11px] uppercase tracking-wider text-brand font-medium px-1 pb-2">
              · Mais provável
            </p>
            <CandidateCard
              candidate={topCandidate}
              onSelect={onSelect}
              isTop={true}
            />
          </div>
        )}

        {/* Other candidates section */}
        {otherCandidates.length > 0 && (
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted font-medium px-1 pb-2 pt-1">
              Outras opções com este nome
            </p>
            <div className="flex flex-col gap-2">
              {otherCandidates.map((candidate, i) => (
                <CandidateCard
                  key={i}
                  candidate={candidate}
                  onSelect={onSelect}
                  isTop={false}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 border-t border-rule px-6 py-4 text-center bg-bg">
        <Button
          variant="link"
          onClick={onNoneMatch}
          className="text-[13px] text-ink-2"
        >
          Nenhum corresponde — refinar pesquisa
        </Button>
      </div>
    </div>
  );
};

export default DisambiguationCard;
