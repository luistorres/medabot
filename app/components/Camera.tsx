import { useRef } from "react";
import Webcam from "react-webcam";

const Camera = ({ onCapture }: { onCapture: (imageSrc: string) => void }) => {
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
    <div className="flex flex-col items-center w-full max-w-2xl mx-auto">
      <h2 className="text-lg font-semibold mb-4 text-center">
        Please scan your medicine package
      </h2>
      <div className="w-full aspect-video">
        <Webcam
          ref={webcamRef}
          screenshotFormat="image/jpeg"
          videoConstraints={videoConstraints}
          className="w-full h-full object-cover rounded-lg"
          screenshotQuality={0.95}
        />
      </div>
      <button
        onClick={capture}
        className="bg-blue-500 text-white px-6 py-3 rounded-md mt-4 text-lg font-medium"
      >
        Capture
      </button>
    </div>
  );
};

export default Camera;
