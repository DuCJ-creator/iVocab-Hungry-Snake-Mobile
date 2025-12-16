import { useEffect, useRef, useState } from 'react';
import { Point } from '../types';

// Declare global types for MediaPipe libraries loaded via CDN
declare global {
  interface Window {
    Hands: any;
    Camera: any;
  }
}

export const useHandTracking = (videoElement: HTMLVideoElement | null, enabled: boolean) => {
  const [fingerPosition, setFingerPosition] = useState<Point | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const handsRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);

  useEffect(() => {
    if (!enabled || !videoElement) {
      if (cameraRef.current) {
        cameraRef.current.stop();
        cameraRef.current = null;
      }
      setIsCameraReady(false);
      return;
    }

    const onResults = (results: any) => {
      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        // Get the first hand
        const landmarks = results.multiHandLandmarks[0];
        // Index finger tip is landmark 8
        const indexTip = landmarks[8];
        
        // Mirror X coordinate because webcam is mirrored
        setFingerPosition({
          x: 1 - indexTip.x, 
          y: indexTip.y
        });
      } else {
        setFingerPosition(null);
      }
    };

    const hands = new window.Hands({
      locateFile: (file: string) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
      }
    });

    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    hands.onResults(onResults);
    handsRef.current = hands;

    const camera = new window.Camera(videoElement, {
      onFrame: async () => {
        if (handsRef.current) {
          await handsRef.current.send({ image: videoElement });
        }
      },
      width: 640,
      height: 480
    });

    camera.start()
      .then(() => setIsCameraReady(true))
      .catch((err: any) => console.error("Camera start error", err));

    cameraRef.current = camera;

    return () => {
      if (cameraRef.current) {
        cameraRef.current.stop();
      }
    };
  }, [enabled, videoElement]);

  return { fingerPosition, isCameraReady };
};