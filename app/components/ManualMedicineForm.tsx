import { useState } from "react";
import { IdentifyMedicineResponse } from "../core/identify";

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
    <div className="min-h-screen bg-gradient-to-br from-primary-50/40 to-white flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
          {/* Header */}
          <div className="flex items-center mb-6">
            <button
              onClick={onCancel}
              className="mr-4 text-gray-400 hover:text-gray-700 transition-colors"
              aria-label="Voltar"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Pesquisa avançada
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Preencha os campos com a informação da embalagem
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            {/* Name Field */}
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Nome do medicamento <span className="text-error-600">*</span>
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                onBlur={() => handleBlur("name")}
                placeholder="Ex: Paracetamol"
                autoFocus
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors ${
                  errors.name
                    ? "border-error-200 bg-error-50 focus:ring-error-500"
                    : "border-gray-300 bg-white"
                }`}
              />
              {errors.name && (
                <p className="mt-1.5 text-sm text-error-600 flex items-center gap-1">
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
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Substância ativa <span className="text-error-600">*</span>
              </label>
              <input
                type="text"
                id="activeSubstance"
                value={formData.activeSubstance}
                onChange={(e) => handleChange("activeSubstance", e.target.value)}
                onBlur={() => handleBlur("activeSubstance")}
                placeholder="Ex: Paracetamol"
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors ${
                  errors.activeSubstance
                    ? "border-error-200 bg-error-50 focus:ring-error-500"
                    : "border-gray-300 bg-white"
                }`}
              />
              {errors.activeSubstance && (
                <p className="mt-1.5 text-sm text-error-600 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                  {errors.activeSubstance}
                </p>
              )}
              {!errors.activeSubstance && (
                <p className="mt-1 text-xs text-gray-400">
                  Indicada na embalagem, geralmente junto ao nome
                </p>
              )}
            </div>

            {/* Brand Field */}
            <div>
              <label
                htmlFor="brand"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Marca{" "}
                <span className="text-gray-400 font-normal text-xs">(opcional)</span>
              </label>
              <input
                type="text"
                id="brand"
                value={formData.brand}
                onChange={(e) => handleChange("brand", e.target.value)}
                placeholder="Ex: Ben-u-ron, Genérico"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
              />
            </div>

            {/* Dosage Field */}
            <div>
              <label
                htmlFor="dosage"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Dosagem{" "}
                <span className="text-gray-400 font-normal text-xs">(opcional)</span>
              </label>
              <input
                type="text"
                id="dosage"
                value={formData.dosage}
                onChange={(e) => handleChange("dosage", e.target.value)}
                placeholder="Ex: 500 mg, 1 g"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
              />
              <p className="mt-1 text-xs text-gray-400">
                Ajuda a distinguir entre embalagens diferentes do mesmo medicamento
              </p>
            </div>

            {/* Info Box */}
            <div className="bg-primary-50 border border-primary-100 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-primary-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
                </svg>
                <div className="text-sm text-primary-800">
                  <p className="font-medium mb-1">Só os dois primeiros campos são obrigatórios.</p>
                  <p className="text-primary-700 font-light">
                    A marca e a dosagem ajudam a encontrar a versão certa se existirem várias embalagens.
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-600 font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                Voltar
              </button>
              <button
                type="submit"
                className="flex-1 px-6 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors shadow-lg hover:shadow-xl"
              >
                Procurar folheto
              </button>
            </div>
          </form>
        </div>

        {/* Direct path back to landing */}
        {onCancelToLanding && (
          <div className="text-center mt-6">
            <button
              onClick={onCancelToLanding}
              className="text-sm text-gray-500 hover:text-gray-700 font-medium"
            >
              Voltar ao início
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManualMedicineForm;
