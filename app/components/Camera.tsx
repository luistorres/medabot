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
    <div>
      <Webcam ref={webcamRef} screenshotFormat="image/jpeg" />
      <button onClick={capture}>Capture</button>
    </div>
  );
};

export default Camera;
