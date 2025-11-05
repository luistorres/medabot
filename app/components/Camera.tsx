import { useRef } from "react";
import Webcam from "react-webcam";

interface CameraProps {
  onCapture: (imageSrc: string) => void;
  onCancel?: () => void;
}

const Camera = ({ onCapture, onCancel }: CameraProps) => {
  const webcamRef = useRef<Webcam>(null);

  const capture = () => {
    const imageSrc = webcamRef.current?.getScreenshot();

    if (imageSrc) {
      onCapture(imageSrc);
    }
  };

  const videoConstraints = {
    facingMode: "environment",
    width: { ideal: 1920 },
    height: { ideal: 1080 },
    aspectRatio: 16 / 9,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
          {/* Header with back button */}
          <div className="flex items-center mb-6">
            {onCancel && (
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
            )}
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Digitalizar Medicamento
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Aponte a câmara para a embalagem do medicamento
              </p>
            </div>
          </div>

          {/* Camera View */}
          <div className="w-full aspect-video mb-6">
            <Webcam
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              videoConstraints={videoConstraints}
              className="w-full h-full object-cover rounded-lg shadow-inner"
              screenshotQuality={0.95}
            />
          </div>

          {/* Tips */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <span className="text-blue-600 mr-2 mt-0.5">💡</span>
              <div className="text-sm text-blue-900">
                <p className="font-medium mb-1">Dicas para melhor resultado:</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Certifique-se que a embalagem está bem iluminada</li>
                  <li>Capture o rótulo frontal com nome e dosagem visíveis</li>
                  <li>Mantenha a câmara estável</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            {onCancel && (
              <button
                onClick={onCancel}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
            )}
            <button
              onClick={capture}
              className="flex-1 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
            >
              📸 Capturar Imagem
            </button>
          </div>
        </div>

        {/* Alternative Option */}
        {onCancel && (
          <div className="text-center mt-6">
            <p className="text-sm text-gray-600">
              Dificuldades com a câmara?{" "}
              <button
                onClick={onCancel}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Introduzir manualmente
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Camera;
