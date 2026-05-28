import { useState } from "react";
import { IdentifyMedicineResponse } from "../core/identify";
import Button from "./ui/Button";
import { Wordmark } from "./ui/Wordmark";
import { Icon } from "./ui/Icon";

interface ManualMedicineFormProps {
  onSubmit: (data: IdentifyMedicineResponse) => void;
  onCancel: () => void;
  onCancelToLanding?: () => void;
  initialData?: Partial<IdentifyMedicineResponse>;
}

const ManualMedicineForm = ({
  onSubmit,
  onCancel,
  onCancelToLanding,
  initialData,
}: ManualMedicineFormProps) => {
  const [formData, setFormData] = useState<IdentifyMedicineResponse>({
    name: initialData?.name || "",
    activeSubstance: initialData?.activeSubstance || "",
    brand: initialData?.brand || "",
    dosage: initialData?.dosage || "",
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  // Track which fields have been blurred at least once
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});

  const validateField = (field: string, value: string): string => {
    if (field === "name" && !value.trim()) {
      return "O nome do medicamento é obrigatório";
    }
    if (field === "activeSubstance" && !value.trim()) {
      return "A substância ativa é obrigatória";
    }
    return "";
  };

  const handleChange = (field: keyof IdentifyMedicineResponse, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error as soon as the field becomes valid (live feedback after blur)
    if (touched[field]) {
      const err = validateField(field, value);
      setErrors((prev) => ({ ...prev, [field]: err }));
    }
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const value = (formData as Record<string, string>)[field] ?? "";
    const err = validateField(field, value);
    setErrors((prev) => ({ ...prev, [field]: err }));
  };

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    const nameErr = validateField("name", formData.name);
    if (nameErr) newErrors.name = nameErr;

    const substanceErr = validateField("activeSubstance", formData.activeSubstance);
    if (substanceErr) newErrors.activeSubstance = substanceErr;

    setErrors(newErrors);
    // Mark required fields as touched so errors are visible
    setTouched({ name: true, activeSubstance: true });
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (validateForm()) {
      onSubmit(formData);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col lg:max-w-2xl lg:mx-auto lg:border-x lg:border-rule">
      {/* Mobile header */}
      <div className="flex items-center justify-between px-6 py-3.5 border-b border-rule">
        <button
          onClick={onCancel}
          className="text-ink-2 hover:text-ink transition-colors flex items-center"
          aria-label="Voltar"
        >
          <Icon.back className="w-5 h-5" />
        </button>
        <Wordmark size={16} />
        <span className="w-5" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-6 pt-7 pb-10">
          {/* Eyebrow + heading */}
          <p className="text-[11px] uppercase tracking-[0.12em] text-brand font-medium mb-2.5">
            Procurar com mais detalhe
          </p>
          <h1 className="font-serif text-[28px] font-normal leading-[1.1] tracking-[-0.02em] text-ink mb-2">
            Pesquisa avançada
          </h1>
          <p className="text-[14px] leading-[1.5] text-ink-2 mb-8">
            Preencha os campos com a informação da embalagem
          </p>

          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            {/* Name Field */}
            <div>
              <label
                htmlFor="name"
                className="block text-[11px] uppercase tracking-[0.1em] text-muted font-medium mb-1.5"
              >
                Nome do medicamento <span className="text-error normal-case tracking-normal">*</span>
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                onBlur={() => handleBlur("name")}
                placeholder="Ex: Paracetamol"
                autoFocus
                className={`w-full bg-paper border rounded-lg px-3 py-2.5 text-[15px] text-ink placeholder:text-faint focus:outline-none transition-colors ${
                  errors.name
                    ? "border-error bg-error-soft focus:border-error"
                    : "border-border focus:border-ink"
                }`}
              />
              {errors.name && (
                <p className="mt-1.5 text-[13px] text-error flex items-center gap-1">
                  <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                  {errors.name}
                </p>
              )}
            </div>

            {/* Active Substance Field */}
            <div>
              <label
                htmlFor="activeSubstance"
                className="block text-[11px] uppercase tracking-[0.1em] text-muted font-medium mb-1.5"
              >
                Substância ativa <span className="text-error normal-case tracking-normal">*</span>
              </label>
              <input
                type="text"
                id="activeSubstance"
                value={formData.activeSubstance}
                onChange={(e) => handleChange("activeSubstance", e.target.value)}
                onBlur={() => handleBlur("activeSubstance")}
                placeholder="Ex: Paracetamol"
                className={`w-full bg-paper border rounded-lg px-3 py-2.5 text-[15px] text-ink placeholder:text-faint focus:outline-none transition-colors ${
                  errors.activeSubstance
                    ? "border-error bg-error-soft focus:border-error"
                    : "border-border focus:border-ink"
                }`}
              />
              {errors.activeSubstance && (
                <p className="mt-1.5 text-[13px] text-error flex items-center gap-1">
                  <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                  {errors.activeSubstance}
                </p>
              )}
              {!errors.activeSubstance && (
                <p className="mt-1 text-[12px] text-muted">
                  Indicada na embalagem, geralmente junto ao nome
                </p>
              )}
            </div>

            {/* Brand Field */}
            <div>
              <label
                htmlFor="brand"
                className="block text-[11px] uppercase tracking-[0.1em] text-muted font-medium mb-1.5"
              >
                Marca{" "}
                <span className="normal-case tracking-normal text-faint font-normal">(opcional)</span>
              </label>
              <input
                type="text"
                id="brand"
                value={formData.brand}
                onChange={(e) => handleChange("brand", e.target.value)}
                placeholder="Ex: Ben-u-ron, Genérico"
                className="w-full bg-paper border border-border rounded-lg px-3 py-2.5 text-[15px] text-ink placeholder:text-faint focus:border-ink focus:outline-none transition-colors"
              />
            </div>

            {/* Dosage Field */}
            <div>
              <label
                htmlFor="dosage"
                className="block text-[11px] uppercase tracking-[0.1em] text-muted font-medium mb-1.5"
              >
                Dosagem{" "}
                <span className="normal-case tracking-normal text-faint font-normal">(opcional)</span>
              </label>
              <input
                type="text"
                id="dosage"
                value={formData.dosage}
                onChange={(e) => handleChange("dosage", e.target.value)}
                placeholder="Ex: 500 mg, 1 g"
                className="w-full bg-paper border border-border rounded-lg px-3 py-2.5 text-[15px] text-ink placeholder:text-faint focus:border-ink focus:outline-none transition-colors"
              />
              <p className="mt-1 text-[12px] text-muted">
                Ajuda a distinguir entre embalagens diferentes do mesmo medicamento
              </p>
            </div>

            {/* Info note */}
            <div className="bg-surface border border-rule rounded-lg px-4 py-3.5">
              <div className="flex items-start gap-2.5">
                <svg className="w-4 h-4 text-brand mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
                </svg>
                <div>
                  <p className="text-[13px] text-ink font-medium mb-0.5">
                    Só os dois primeiros campos são obrigatórios.
                  </p>
                  <p className="text-[13px] text-ink-2">
                    A marca e a dosagem ajudam a encontrar a versão certa se existirem várias embalagens.
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <Button
                type="button"
                variant="secondary"
                onClick={onCancel}
                className="flex-1"
              >
                Voltar
              </Button>
              <Button
                type="submit"
                variant="primary"
                className="flex-1"
              >
                Procurar folheto
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Direct path back to landing */}
      {onCancelToLanding && (
        <div className="text-center py-5 border-t border-rule">
          <Button
            type="button"
            variant="link"
            onClick={onCancelToLanding}
          >
            Voltar ao início
          </Button>
        </div>
      )}
    </div>
  );
};

export default ManualMedicineForm;
