'use client';

import { useState, useRef, useEffect } from 'react';
import { detectFace, enrollFace, verifyFace, checkBrowserSupport, loadFaceModels } from '@/lib/face-recognition';

interface FaceLoginProps {
  onEnroll?: (descriptor: Float32Array) => Promise<void>;
  onVerify?: (descriptor: Float32Array) => Promise<boolean>;
  mode: 'enroll' | 'verify';
  onComplete?: () => void;
  onError?: (error: string) => void;
}

export default function FaceLogin({
  onEnroll,
  onVerify,
  mode,
  onComplete,
  onError,
}: FaceLoginProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [modelsReady, setModelsReady] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    initializeCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const initializeCamera = async () => {
    try {
      // Check browser support
      const support = checkBrowserSupport();
      if (!support.supported) {
        setError(support.errors.join(', '));
        setIsLoading(false);
        return;
      }

      // Load face recognition models
      const modelsLoaded = await loadFaceModels();
      if (!modelsLoaded) {
        setError('Failed to load face recognition models. Please download the models from https://github.com/justadudewhohacks/face-api.js-models and place them in public/models/ directory. See FACE_MODELS_DOWNLOAD.md for instructions.');
        setIsLoading(false);
        if (onError) {
          onError('Models not found. Please download face-api.js models. See FACE_MODELS_DOWNLOAD.md');
        }
        return;
      }
      setModelsReady(true);

      // Get camera stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setStatus('Camera ready. Position your face in the frame.');
        setIsLoading(false);
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to access camera';
      setError(errorMsg);
      setIsLoading(false);
      if (onError) onError(errorMsg);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const captureAndProcess = async () => {
    if (!videoRef.current || !modelsReady) return;

    setIsProcessing(true);
    setStatus('Processing...');
    setError('');

    try {
      if (mode === 'enroll') {
        const descriptor = await enrollFace(videoRef.current);
        if (descriptor && onEnroll) {
          await onEnroll(descriptor);
          setStatus('Face enrolled successfully!');
          if (onComplete) onComplete();
        }
      } else if (mode === 'verify') {
        // For verification, we need the stored descriptor
        // This will be handled by the parent component
        setStatus('Face verification mode - use verifyFaceWithDescriptor');
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Face processing failed';
      setError(errorMsg);
      if (onError) onError(errorMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  const verifyFaceWithDescriptor = async (storedDescriptor: Float32Array) => {
    if (!videoRef.current || !modelsReady) return;

    setIsProcessing(true);
    setStatus('Verifying face...');
    setError('');

    try {
      const result = await verifyFace(videoRef.current, storedDescriptor);
      if (result.match) {
        setStatus('Face verified successfully!');
        if (onComplete) onComplete();
        return true;
      } else {
        setError('Face does not match. Please try again.');
        return false;
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Face verification failed';
      setError(errorMsg);
      if (onError) onError(errorMsg);
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  // Expose verify function to parent
  useEffect(() => {
    if (mode === 'verify' && onVerify) {
      // Parent can call verifyFaceWithDescriptor through ref
    }
  }, [mode, onVerify]);

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Camera View */}
        <div className="relative bg-black">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-auto"
            style={{ transform: 'scaleX(-1)' }} // Mirror effect
          />
          <canvas ref={canvasRef} className="hidden" />
          
          {/* Overlay Instructions */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
              <div className="text-center text-white">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white mx-auto mb-4"></div>
                <p>Loading camera...</p>
              </div>
            </div>
          )}

          {/* Face Detection Guide */}
          {!isLoading && modelsReady && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="border-2 border-green-400 rounded-full w-64 h-64 opacity-50"></div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="p-6 bg-gradient-to-br from-gray-50 to-white">
          <div className="space-y-4">
            {/* Status Messages */}
            {status && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-sm text-blue-800">{status}</p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Action Button */}
            {mode === 'enroll' && (
              <button
                onClick={captureAndProcess}
                disabled={isLoading || isProcessing || !modelsReady}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold py-4 rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center space-x-2"
              >
                {isProcessing ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>Capture Face</span>
                  </>
                )}
              </button>
            )}

            {/* Instructions */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              <p className="text-sm font-semibold text-gray-900">Instructions:</p>
              <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
                <li>Ensure good lighting</li>
                <li>Face the camera directly</li>
                <li>Remove glasses if possible</li>
                <li>Keep a neutral expression</li>
                <li>Stay still during capture</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

