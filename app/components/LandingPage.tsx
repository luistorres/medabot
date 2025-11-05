interface LandingPageProps {
  onScanMedicine: () => void;
  onManualEntry: () => void;
}

const LandingPage = ({ onScanMedicine, onManualEntry }: LandingPageProps) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-50 h-50 bg-[#b4dae1] rounded-2xl mb-6 shadow-lg">
            <img src="/logo.png" alt="MedaBot Logo" className="w-full h-full object-contain p-2 rounded-2xl" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            MedaBot
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 max-w-2xl mx-auto">
            Obtenha informações fiáveis sobre medicamentos a partir dos folhetos
            oficiais
          </p>
        </div>

        {/* Value Proposition */}
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Como funciona?
          </h2>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {/* Step 1 */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                <span className="text-3xl">🔍</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">
                1. Identifique
              </h3>
              <p className="text-sm text-gray-600">
                Digitalize ou introduza manualmente os dados do medicamento
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                <span className="text-3xl">📄</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">
                2. Processe
              </h3>
              <p className="text-sm text-gray-600">
                Obtemos o folheto oficial e processamos com IA
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                <span className="text-3xl">💬</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-3">3. Questione</h3>
              <p className="text-sm text-gray-600">
                Faça perguntas e receba respostas baseadas no folheto
              </p>
            </div>
          </div>

          {/* Key Features */}
          <div className="bg-blue-50 rounded-xl p-6 mb-8">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
              <span className="mr-2">✨</span>
              Características principais
            </h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start">
                <span className="text-green-600 mr-2 mt-0.5">✓</span>
                <span>
                  <strong>Informação oficial:</strong> Apenas dados do folheto
                  informativo (bula) regulamentar
                </span>
              </li>
              <li className="flex items-start">
                <span className="text-green-600 mr-2 mt-0.5">✓</span>
                <span>
                  <strong>Visualização do PDF:</strong> Consulte o folheto
                  completo em paralelo
                </span>
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="grid md:grid-cols-2 gap-4">
            <button
              onClick={onScanMedicine}
              className="group relative bg-blue-600 hover:bg-blue-700 text-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-1"
            >
              <div className="flex flex-col items-center">
                <span className="text-4xl mb-3">📸</span>
                <span className="text-xl font-bold mb-2">
                  Digitalizar Medicamento
                </span>
                <span className="text-sm text-blue-100">
                  Use a câmara para identificar
                </span>
              </div>
              <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 rounded-xl transition-opacity"></div>
            </button>

            <button
              onClick={onManualEntry}
              className="group relative bg-gray-700 hover:bg-gray-800 text-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-1"
            >
              <div className="flex flex-col items-center">
                <span className="text-4xl mb-3">✍️</span>
                <span className="text-xl font-bold mb-2">
                  Introduzir Manualmente
                </span>
                <span className="text-sm text-gray-300">
                  Escrever os dados do medicamento
                </span>
              </div>
              <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 rounded-xl transition-opacity"></div>
            </button>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="text-center text-sm text-gray-600">
          <p className="flex items-center justify-center">
            <span className="mr-2">ℹ️</span>
            Este serviço fornece informação educativa. Consulte sempre um
            profissional de saúde para aconselhamento médico.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
