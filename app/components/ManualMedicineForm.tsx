import { useState } from "react";
import { IdentifyMedicineResponse } from "../core/identify";

interface ManualMedicineFormProps {
  onSubmit: (data: IdentifyMedicineResponse) => void;
  onCancel: () => void;
  initialData?: Partial<IdentifyMedicineResponse>;
}

const ManualMedicineForm = ({
  onSubmit,
  onCancel,
  initialData,
}: ManualMedicineFormProps) => {
  const [formData, setFormData] = useState<IdentifyMedicineResponse>({
    name: initialData?.name || "",
    activeSubstance: initialData?.activeSubstance || "",
    brand: initialData?.brand || "",
    dosage: initialData?.dosage || "",
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const handleChange = (field: keyof IdentifyMedicineResponse, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user types
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.name.trim()) {
      newErrors.name = "Nome do medicamento é obrigatório";
    }

    if (!formData.activeSubstance.trim()) {
      newErrors.activeSubstance = "Substância activa é obrigatória";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (validateForm()) {
      onSubmit(formData);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
          {/* Header */}
          <div className="flex items-center mb-6">
            <button
              onClick={onCancel}
              className="mr-4 text-gray-600 hover:text-gray-800 transition-colors"
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
                Introduzir Dados do Medicamento
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Preencha os campos com a informação da embalagem
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name Field */}
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Nome do Medicamento <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="Ex: Paracetamol"
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                  errors.name
                    ? "border-red-300 bg-red-50"
                    : "border-gray-300 bg-white"
                }`}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            {/* Active Substance Field */}
            <div>
              <label
                htmlFor="activeSubstance"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Substância Activa <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="activeSubstance"
                value={formData.activeSubstance}
                onChange={(e) => handleChange("activeSubstance", e.target.value)}
                placeholder="Ex: Paracetamol"
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                  errors.activeSubstance
                    ? "border-red-300 bg-red-50"
                    : "border-gray-300 bg-white"
                }`}
              />
              {errors.activeSubstance && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.activeSubstance}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Encontra-se geralmente na embalagem junto ao nome
              </p>
            </div>

            {/* Brand Field */}
            <div>
              <label
                htmlFor="brand"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Marca
              </label>
              <input
                type="text"
                id="brand"
                value={formData.brand}
                onChange={(e) => handleChange("brand", e.target.value)}
                placeholder="Ex: Genérico, Ben-u-ron (opcional)"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              />
              <p className="mt-1 text-xs text-gray-500">
                Pode deixar em branco se não souber
              </p>
            </div>

            {/* Dosage Field */}
            <div>
              <label
                htmlFor="dosage"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Dosagem
              </label>
              <input
                type="text"
                id="dosage"
                value={formData.dosage}
                onChange={(e) => handleChange("dosage", e.target.value)}
                placeholder="Ex: 500mg, 1g (opcional)"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              />
              <p className="mt-1 text-xs text-gray-500">
                Indica a quantidade de substância activa
              </p>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <span className="text-blue-600 mr-2 mt-0.5">💡</span>
                <div className="text-sm text-blue-900">
                  <p className="font-medium mb-1">Dica:</p>
                  <p>
                    Os campos <strong>Nome</strong> e{" "}
                    <strong>Substância Activa</strong> são suficientes para
                    encontrar o folheto. Os outros campos ajudam a identificar
                    o medicamento específico se existirem várias opções.
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
              >
                Procurar Medicamento
              </button>
            </div>
          </form>
        </div>

        {/* Alternative Option */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-600">
            Prefere digitalizar a embalagem?{" "}
            <button
              onClick={onCancel}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Usar câmara
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ManualMedicineForm;
