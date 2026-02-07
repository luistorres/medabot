import Card from "./ui/Card";
import Button from "./ui/Button";

export interface Candidate {
  name: string;
  activeSubstance: string;
  similarity: number;
}

interface DisambiguationCardProps {
  candidates: Candidate[];
  onSelect: (candidate: Candidate) => void;
  onNoneMatch: () => void;
}

const DisambiguationCard = ({ candidates, onSelect, onNoneMatch }: DisambiguationCardProps) => {
  return (
    <Card padding="lg" className="animate-fade-in">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-warning-50 flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-warning-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
          </svg>
        </div>
        <div>
          <h4 className="font-semibold text-gray-900">Encontrámos várias opções</h4>
          <p className="text-sm text-gray-500 mt-0.5">Selecione o medicamento correto:</p>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        {candidates.map((candidate, i) => (
          <button
            key={i}
            onClick={() => onSelect(candidate)}
            className="w-full text-left p-3 rounded-xl border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-all group"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 group-hover:text-primary-700">{candidate.name}</p>
                <p className="text-sm text-gray-500">{candidate.activeSubstance}</p>
              </div>
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                {Math.round(candidate.similarity * 100)}%
              </span>
            </div>
          </button>
        ))}
      </div>

      <Button variant="ghost" fullWidth onClick={onNoneMatch}>
        Nenhum destes - pesquisar manualmente
      </Button>
    </Card>
  );
};

export default DisambiguationCard;
