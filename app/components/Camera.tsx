import { useRef, useState } from "react";
import Webcam from "react-webcam";

interface CameraProps {
  onCapture: (imageSrc: string) => void;
  onCancel?: () => void;
}

const Camera = ({ onCapture, onCancel }: CameraProps) => {
  const webcamRef = useRef<Webcam>(null);
  const [flash, setFlash] = useState(false);

  const capture = () => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      // White flash effect
      setFlash(true);
      setTimeout(() => {
        setFlash(false);
        onCapture(imageSrc);
      }, 200);
    }
  };

  const videoConstraints = {
    facingMode: "environment",
    width: { ideal: 1920 },
    height: { ideal: 1080 },
    aspectRatio: 16 / 9,
  };

  return (
    <div className="fixed inset-0 bg-black flex flex-col z-50">
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 pt-[env(safe-area-inset-top)] h-16">
        {onCancel && (
          <button
            onClick={onCancel}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-white/80 hover:text-white"
            aria-label="Fechar"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
        <span className="text-white/60 text-sm font-medium">Enquadre a embalagem</span>
        <div className="w-11" /> {/* Spacer for centering */}
      </div>

      {/* Viewfinder */}
      <div className="flex-1 relative overflow-hidden">
        <Webcam
          ref={webcamRef}
          screenshotFormat="image/jpeg"
          videoConstraints={videoConstraints}
          className="absolute inset-0 w-full h-full object-cover"
          screenshotQuality={0.95}
        />

        {/* SVG framing guide */}
        <div className="absolute inset-0 pointer-events-none">
          <svg className="w-full h-full" viewBox="0 0 400 600" preserveAspectRatio="xMidYMid slice">
            {/* Dimmed overlay with cutout */}
            <defs>
              <mask id="cutout">
                <rect width="400" height="600" fill="white" />
                <rect x="40" y="150" width="320" height="300" rx="20" fill="black" />
              </mask>
            </defs>
            <rect width="400" height="600" fill="rgba(0,0,0,0.4)" mask="url(#cutout)" />

            {/* Corner brackets */}
            <g stroke="white" strokeWidth="3" fill="none" strokeLinecap="round">
              {/* Top-left */}
              <path d="M60 170 L60 160 Q60 150 70 150 L90 150" />
              {/* Top-right */}
              <path d="M340 170 L340 160 Q340 150 330 150 L310 150" />
              {/* Bottom-left */}
              <path d="M60 430 L60 440 Q60 450 70 450 L90 450" />
              {/* Bottom-right */}
              <path d="M340 430 L340 440 Q340 450 330 450 L310 450" />
            </g>
          </svg>
        </div>

        {/* Flash overlay */}
        {flash && (
          <div className="absolute inset-0 bg-white z-30 animate-fade-in" />
        )}
      </div>

      {/* Bottom controls */}
      <div className="flex-shrink-0 bg-black/80 pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-center py-6 gap-8">
          {/* Manual entry link */}
          {onCancel && (
            <button
              onClick={onCancel}
              className="text-white/60 text-xs font-medium hover:text-white/80 min-h-[44px] flex items-center"
            >
              Introduzir<br/>manualmente
            </button>
          )}

          {/* Capture button */}
          <button
            onClick={capture}
            className="w-[72px] h-[72px] rounded-full border-4 border-white flex items-center justify-center active:scale-90 transition-transform"
            aria-label="Capturar"
          >
            <div className="w-[60px] h-[60px] rounded-full bg-white active:bg-gray-200 transition-colors" />
          </button>

          {/* Spacer for centering */}
          <div className="w-16" />
        </div>
      </div>
    </div>
  );
};

export default Camera;
