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

  return (
    <div className="flex flex-col">
      <Webcam ref={webcamRef} screenshotFormat="image/jpeg" />
      <button
        onClick={capture}
        className="bg-blue-500 text-white px-4 py-2 rounded-md mt-4"
      >
        Capture
      </button>
    </div>
  );
};

export default Camera;
