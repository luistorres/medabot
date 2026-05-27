import { useRef, useState } from "react";
import Webcam from "react-webcam";
import { Icon } from "./ui/Icon";

interface CameraProps {
  onCapture: (imageSrc: string) => void;
  onCancel?: () => void;
  onManualEntry?: () => void;
}

const Camera = ({ onCapture, onCancel, onManualEntry }: CameraProps) => {
  const webcamRef = useRef<Webcam>(null);
  const [flash, setFlash] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result;
      if (typeof result === "string") {
        onCapture(result);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 flex flex-col z-50" style={{ background: "#0E0D0B", fontFamily: "var(--font-sans)" }}>
      {/* Hidden file input for "Usar foto existente" */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Top bar */}
      <div
        className="flex items-center justify-between px-[18px] pt-[env(safe-area-inset-top)] z-20"
        style={{ paddingTop: `calc(env(safe-area-inset-top) + 14px)`, paddingBottom: 12, background: "rgba(14,13,11,0.6)" }}
      >
        {onCancel ? (
          <button
            onClick={onCancel}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-white/85 hover:text-white"
            aria-label="Fechar"
          >
            <Icon.close className="w-[18px] h-[18px]" />
          </button>
        ) : (
          <span className="w-[44px]" />
        )}

        <span className="flex items-center gap-1.5" style={{ fontFamily: "var(--font-serif)", fontSize: 16, fontWeight: 500, color: "#fff", letterSpacing: "-0.005em" }}>
          <Icon.dot className="text-accent w-[6px] h-[6px] flex-shrink-0" />
          Aponte à embalagem
        </span>

        {/* Spacer to keep title centered */}
        <span className="w-[44px]" />
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

        {/* Overlays */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Radial hint texture */}
          <div
            className="absolute inset-0"
            style={{ background: "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.04) 0%, transparent 70%)" }}
          />

          {/* Faint dashed box silhouette */}
          <div
            className="absolute"
            style={{
              left: "50%",
              top: "46%",
              transform: "translate(-50%, -50%)",
              width: 180,
              height: 220,
              background: "rgba(255,255,255,0.02)",
              border: "1px dashed rgba(255,255,255,0.12)",
            }}
          />

          {/* Corner brackets in amber (--color-accent) */}
          <svg
            className="absolute inset-0 w-full h-full"
            viewBox="0 0 390 600"
            preserveAspectRatio="none"
          >
            <g stroke="var(--color-accent)" strokeWidth="2.5" fill="none" strokeLinecap="round">
              {/* Top-left */}
              <path d="M85 170 L85 158 L97 158" />
              {/* Top-right */}
              <path d="M305 170 L305 158 L293 158" />
              {/* Bottom-left */}
              <path d="M85 430 L85 442 L97 442" />
              {/* Bottom-right */}
              <path d="M305 430 L305 442 L293 442" />
            </g>
          </svg>

          {/* Helper text — privacy reassurance */}
          <div
            className="absolute left-6 right-6 text-center"
            style={{ top: 470, color: "rgba(255,255,255,0.65)", fontSize: 12, lineHeight: 1.5 }}
          >
            A foto fica entre nós. Não é guardada.
          </div>
        </div>

        {/* Flash overlay */}
        {flash && (
          <div className="absolute inset-0 bg-white z-30 animate-fade-in" />
        )}
      </div>

      {/* Bottom controls */}
      <div
        className="flex-shrink-0 flex items-center justify-between px-6 z-20"
        style={{
          paddingTop: 20,
          paddingBottom: `calc(env(safe-area-inset-bottom) + 32px)`,
          background: "rgba(14,13,11,0.6)",
        }}
      >
        {/* Left: Procurar pelo nome → onManualEntry */}
        <button
          onClick={onManualEntry ?? onCancel}
          className="min-h-[44px] flex items-center justify-start"
          style={{ fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.7)", textAlign: "left", lineHeight: 1.3 }}
          aria-label="Procurar pelo nome"
        >
          Procurar<br />pelo nome
        </button>

        {/* Center: Capture button */}
        <button
          onClick={capture}
          className="w-[72px] h-[72px] rounded-full flex items-center justify-center active:scale-90 transition-transform"
          style={{ border: "3px solid #fff", background: "transparent" }}
          aria-label="Capturar foto"
        >
          <span className="w-[58px] h-[58px] rounded-full bg-white" />
        </button>

        {/* Right: Usar foto existente → file picker */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="min-h-[44px] flex items-center justify-end"
          style={{ fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.7)", textAlign: "right", lineHeight: 1.3 }}
          aria-label="Usar foto existente"
        >
          Usar foto<br />existente
        </button>
      </div>
    </div>
  );
};

export default Camera;
