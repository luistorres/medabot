import { IdentifyMedicineResponse } from "../core/identify";
import Button from "./ui/Button";

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

const CheckIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);

const SpinnerIcon = () => (
  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white" />
);

const ProcessingScreen = ({
  steps,
  currentStep,
  completedSteps,
  medicineInfo,
  processingError,
  failedStep,
  loading,
  searchMessage,
  onRetryStep,
  onGoToCamera,
  onGoToManualForm,
  onReset,
}: ProcessingScreenProps) => {
  return (
    <div className="min-h-screen bg-mesh-landing flex items-center justify-center p-6 relative overflow-hidden">
      {/* Decorative floating orbs */}
      <div className="absolute top-24 right-6 w-32 h-32 rounded-full bg-accent-400/10 blur-2xl animate-float" />
      <div className="absolute bottom-32 left-8 w-40 h-40 rounded-full bg-primary-400/8 blur-3xl animate-float stagger-3" />

      <div className="max-w-lg w-full space-y-4 relative z-10">
        {/* Medicine Info Card - shows once identified */}
        {medicineInfo && (completedSteps.includes("identify") || medicineInfo.name) && medicineInfo.name && (
          <div className="glass rounded-2xl ring-1 ring-gray-200/60 shadow-sm p-5 animate-stagger-in stagger-1">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-primary-100/80 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-700 text-gray-900 text-base tracking-tight">{medicineInfo.name}</h3>
                <p className="text-sm text-gray-500 mt-0.5 font-light">{medicineInfo.activeSubstance}</p>
                {medicineInfo.dosage && (
                  <p className="text-[13px] text-gray-400 font-light">{medicineInfo.dosage}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Processing Steps */}
        {loading && (
          <div className="glass rounded-2xl ring-1 ring-gray-200/60 shadow-sm p-5 animate-stagger-in stagger-2">
            <div className="space-y-3.5">
              {steps.map((step) => {
                const isCompleted = completedSteps.includes(step.id);
                const isCurrent = currentStep === step.id;

                return (
                  <div key={step.id} className="flex items-center gap-3.5">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                        isCompleted
                          ? "bg-accent-500 text-white shadow-sm shadow-accent-500/30"
                          : isCurrent
                            ? "bg-primary-600 text-white shadow-sm shadow-primary-600/30"
                            : "bg-gray-100/80 text-gray-400"
                      }`}
                    >
                      {isCompleted ? <CheckIcon /> : isCurrent ? <SpinnerIcon /> : step.icon}
                    </div>
                    <span
                      className={`text-sm flex-1 ${
                        isCompleted
                          ? "text-accent-700 font-medium"
                          : isCurrent
                            ? "text-primary-700 font-medium"
                            : "text-gray-400 font-light"
                      }`}
                    >
                      {isCurrent && searchMessage ? searchMessage : step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Error Display */}
        {processingError && (
          <div className="glass rounded-2xl ring-1 ring-error-200/60 shadow-sm p-5 animate-fade-in">
            <div className="flex items-start gap-3.5 mb-5">
              <div className="w-10 h-10 rounded-full bg-error-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-error-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="font-700 text-error-800 tracking-tight">Erro de Processamento</h4>
                <p className="text-sm text-error-700 mt-1 font-light">{processingError}</p>
              </div>
            </div>

            {/* Retry specific step */}
            {failedStep && (
              <Button
                variant="primary"
                fullWidth
                onClick={() => onRetryStep(failedStep)}
                className="mb-3 shadow-lg shadow-primary-600/25"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                </svg>
                Tentar novamente
              </Button>
            )}

            <div className="border-t border-gray-200/60 pt-4">
              <p className="text-[13px] text-gray-500 mb-3 font-light">Ou escolha outra opção:</p>
              <div className="grid grid-cols-2 gap-2.5">
                <Button variant="secondary" onClick={onGoToCamera}>
                  Usar câmara
                </Button>
                <Button variant="secondary" onClick={onGoToManualForm}>
                  Manual
                </Button>
              </div>
              <Button variant="ghost" fullWidth onClick={onReset} className="mt-2">
                Voltar ao início
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProcessingScreen;
