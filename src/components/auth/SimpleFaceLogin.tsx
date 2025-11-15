'use client';

import { useState, useRef, useEffect } from 'react';
import {
  checkBrowserSupport,
  enrollFace,
  verifyFace,
  initializeCamera,
  stopCamera,
} from '@/lib/simple-face-auth';

interface SimpleFaceLoginProps {
  onEnroll?: (features: number[], imageData: string) => Promise<void>;
  onVerify?: (features: number[]) => Promise<boolean>;
  mode: 'enroll' | 'verify';
  onComplete?: () => void;
  onError?: (error: string) => void;
}

export default function SimpleFaceLogin({
  onEnroll,
  onVerify,
  mode,
  onComplete,
  onError,
}: SimpleFaceLoginProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [cameraReady, setCameraReady] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [needsPermission, setNeedsPermission] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => {
    // Check browser support first
    const support = checkBrowserSupport();
    if (!support.supported) {
      setError(support.errors.join(', '));
      setIsLoading(false);
      return;
    }

    setIsLoading(false);
    setNeedsPermission(true);
    setStatus('Click "Enable Camera" to begin');

    return () => {
      if (streamRef.current) {
        stopCamera(streamRef.current);
      }
    };
  }, []);

  const requestCameraPermission = async () => {
    setIsLoading(true);
    setError('');
    setNeedsPermission(false);
    setStatus('Requesting camera access...');

    try {
      const stream = await initializeCamera();
      
      if (!stream) {
        throw new Error('Failed to access camera');
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setPermissionGranted(true);
        setCameraReady(true);
        setStatus('Camera ready! Position your face in the frame.');
        setIsLoading(false);
      }
    } catch (err: any) {
      let errorMsg = err.message || 'Failed to access camera';

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMsg = 'Camera permission denied. Please allow camera access and try again.';
        setNeedsPermission(true);
      } else if (err.name === 'NotFoundError') {
        errorMsg = 'No camera found. Please ensure your device has a camera.';
      } else if (err.name === 'NotReadableError') {
        errorMsg = 'Camera is in use by another application. Please close other apps.';
        setNeedsPermission(true);
      }

      setError(errorMsg);
      setIsLoading(false);
      if (onError) {
        onError(errorMsg);
      }
    }
  };

  const startCountdown = async (callback: () => Promise<void>) => {
    for (let i = 3; i > 0; i--) {
      setCountdown(i);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    setCountdown(null);
    await callback();
  };

  const captureAndEnroll = async () => {
    if (!videoRef.current || !cameraReady) {
      setError('Camera not ready');
      return;
    }

    setIsProcessing(true);
    setStatus('Get ready...');

    await startCountdown(async () => {
      setStatus('Capturing...');

      try {
        const result = await enrollFace(videoRef.current!);

        if (!result.success) {
          setError(result.error || 'Enrollment failed');
          setIsProcessing(false);
          if (onError) {
            onError(result.error || 'Enrollment failed');
          }
          return;
        }

        if (result.features && result.imageData && onEnroll) {
          setStatus('Saving face data...');
          await onEnroll(result.features, result.imageData);
          setStatus('Face enrolled successfully!');
          
          setTimeout(() => {
            if (onComplete) {
              onComplete();
            }
          }, 1500);
        }
      } catch (error: any) {
        setError(error.message || 'Enrollment failed');
        if (onError) {
          onError(error.message);
        }
      } finally {
        setIsProcessing(false);
      }
    });
  };

  const captureAndVerify = async () => {
    if (!videoRef.current || !cameraReady) {
      setError('Camera not ready');
      return;
    }

    setIsProcessing(true);
    setStatus('Get ready...');

    await startCountdown(async () => {
      setStatus('Verifying...');

      try {
        // In verify mode, we need stored features from parent
        // This is a simplified flow - parent should provide stored features
        setStatus('Verification in progress...');
        
        // Capture current face
        const imageData = await enrollFace(videoRef.current!);
        
        if (!imageData.success || !imageData.features) {
          setError('Failed to capture face');
          setIsProcessing(false);
          return;
        }

        // Parent component should handle verification with stored features
        if (onVerify) {
          const verified = await onVerify(imageData.features);
          
          if (verified) {
            setStatus('✓ Face verified successfully!');
            setTimeout(() => {
              if (onComplete) {
              onComplete();
            }
            }, 1500);
          } else {
            setError('Face verification failed. Please try again.');
          }
        }
      } catch (error: any) {
        setError(error.message || 'Verification failed');
        if (onError) {
          onError(error.message);
        }
      } finally {
        setIsProcessing(false);
      }
    });
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Camera View */}
        <div className="relative bg-black aspect-video">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
            style={{ transform: 'scaleX(-1)' }} // Mirror effect
          />

          {/* Loading Overlay */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
              <div className="text-center text-white">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white mx-auto mb-4"></div>
                <p>Initializing...</p>
              </div>
            </div>
          )}

          {/* Permission Request Overlay */}
          {needsPermission && !permissionGranted && (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-900 to-blue-900 bg-opacity-95">
              <div className="text-center text-white p-8">
                <svg
                  className="w-20 h-20 mx-auto mb-4 text-yellow-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                <h3 className="text-2xl font-bold mb-2">Camera Access Required</h3>
                <p className="text-gray-200 mb-6">We need camera access for face authentication</p>
                <p className="text-sm text-gray-300 mb-4">Your privacy is protected - images are not stored</p>
              </div>
            </div>
          )}

          {/* Countdown Overlay */}
          {countdown !== null && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70">
              <div className="text-white text-9xl font-bold animate-[scaleIn_0.3s_ease-out]">
                {countdown}
              </div>
            </div>
          )}

          {/* Face Guide Oval */}
          {cameraReady && !isProcessing && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="border-4 border-green-400 rounded-full w-64 h-80 opacity-50 animate-pulse"></div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="p-6 bg-gradient-to-br from-gray-50 to-white">
          <div className="space-y-4">
            {/* Status Messages */}
            {status && !error && (
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                <p className="text-sm text-blue-800 font-medium">{status}</p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                <p className="text-sm text-red-800 font-medium">{error}</p>
              </div>
            )}

            {/* Camera Permission Button */}
            {needsPermission && !permissionGranted && (
              <button
                onClick={requestCameraPermission}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-green-600 to-teal-600 text-white font-semibold py-4 rounded-xl hover:from-green-700 hover:to-teal-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center space-x-2"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    <span>Requesting Access...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                    <span>Enable Camera</span>
                  </>
                )}
              </button>
            )}

            {/* Capture Button */}
            {cameraReady && (
              <button
                onClick={mode === 'enroll' ? captureAndEnroll : captureAndVerify}
                disabled={isProcessing || !cameraReady}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold py-4 rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center space-x-2"
              >
                {isProcessing ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    <span>{mode === 'enroll' ? 'Capture Face' : 'Verify Face'}</span>
                  </>
                )}
              </button>
            )}

            {/* Instructions */}
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-4 border border-purple-200">
              <p className="text-sm font-semibold text-gray-900 mb-2">📋 Instructions:</p>
              <ul className="text-xs text-gray-700 space-y-1.5">
                <li className="flex items-start space-x-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span>Ensure good lighting (face the light)</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span>Face the camera directly</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span>Remove glasses if possible</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span>Keep a neutral expression</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span>Stay still during capture</span>
                </li>
              </ul>
            </div>

            {/* Privacy Notice */}
            <div className="bg-green-50 rounded-lg p-3 border border-green-200">
              <p className="text-xs text-green-800 text-center">
                🔒 Your face data is encrypted and stored securely. We never share your biometric data.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

