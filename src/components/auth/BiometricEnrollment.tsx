'use client';

import { useState, useRef, useEffect } from 'react';
import { enrollFace, checkBrowserSupport, initializeCamera, stopCamera } from '@/lib/simple-face-auth';

interface BiometricEnrollmentProps {
  type: 'face' | 'fingerprint';
  onComplete: () => void;
  onError: (error: string) => void;
  onCancel: () => void;
}

export default function BiometricEnrollment({ type, onComplete, onError, onCancel }: BiometricEnrollmentProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [modelsReady, setModelsReady] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const [enrollmentProgress, setEnrollmentProgress] = useState(0);

  useEffect(() => {
    if (type === 'face') {
      initializeFaceEnrollment();
    } else if (type === 'fingerprint') {
      initializeFingerprintEnrollment();
    }
    return () => {
      stopCamera();
    };
  }, [type]);

  const initializeFaceEnrollment = async () => {
    try {
      const support = checkBrowserSupport();
      if (!support.supported) {
        setError(support.errors.join(', '));
        setIsLoading(false);
        return;
      }

      setModelsReady(true);

      const stream = await initializeCamera();

      if (!stream) {
        throw new Error('Failed to initialize camera');
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsLoading(false);
        setStatus('Position your face in the oval and click "Start Enrollment"');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to access camera');
      setIsLoading(false);
    }
  };

  const initializeFingerprintEnrollment = async () => {
    setIsLoading(false);
    setStatus('Click "Start Enrollment" to begin fingerprint setup');
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const handleFaceEnrollment = async () => {
    if (!videoRef.current || !modelsReady) {
      return;
    }

    setIsProcessing(true);
    setStatus('Get ready...');
    setEnrollmentProgress(0);

    try {
      // Countdown
      for (let i = 3; i > 0; i--) {
        setStatus(`Capturing in ${i}...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      setStatus('Capturing face...');
      setEnrollmentProgress(30);

      // Capture face using simple method (no models needed!)
      const result = await enrollFace(videoRef.current);

      if (!result.success) {
        throw new Error(result.error || 'Face capture failed');
      }

      if (!result.features) {
        throw new Error('No face features extracted');
      }

      setStatus('Saving face data...');
      setEnrollmentProgress(70);

      // Convert features to base64 for storage
      const featuresBase64 = btoa(JSON.stringify(result.features));

      // Send to server
      const response = await fetch('/api/auth/face-enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          faceTemplate: featuresBase64,
        }),
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to save face data');
      }

      setStatus('✓ Face enrollment successful!');
      setEnrollmentProgress(100);
      
      if (streamRef.current) {
        stopCamera();
      }
      
      setTimeout(() => {
        onComplete();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Face enrollment failed');
      setIsProcessing(false);
      setEnrollmentProgress(0);
    }
  };

  const handleFingerprintEnrollment = async () => {
    setIsProcessing(true);
    setStatus('Setting up fingerprint authentication...');

    try {
      // Check if WebAuthn is supported
      if (!window.PublicKeyCredential) {
        throw new Error('Fingerprint authentication is not supported in this browser');
      }

      // Get user email for credential creation
      const userResponse = await fetch('/api/auth/me', { credentials: 'include' });
      if (!userResponse.ok) {
        throw new Error('Failed to get user information');
      }
      const { user } = await userResponse.json();

      // Create credential
      const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
        challenge: Uint8Array.from(
          crypto.getRandomValues(new Uint8Array(32))
        ),
        rp: {
          name: 'Nurse Pro Academy',
          id: window.location.hostname,
        },
        user: {
          id: new TextEncoder().encode(user.email),
          name: user.email,
          displayName: user.name,
        },
        pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
        authenticatorSelection: {
          authenticatorAttachment: 'platform', // Use built-in authenticator (fingerprint)
          userVerification: 'required',
        },
        timeout: 60000,
        attestation: 'direct',
      };

      setStatus('Please use your fingerprint sensor...');
      const credential = await navigator.credentials.create({
        publicKey: publicKeyCredentialCreationOptions,
      }) as PublicKeyCredential;

      if (!credential) {
        throw new Error('Fingerprint enrollment cancelled');
      }

      // Convert credential to base64 for storage
      const responseBuffer = credential.response as AuthenticatorAttestationResponse;
      const clientDataJSON = new Uint8Array(responseBuffer.clientDataJSON);
      const attestationObject = new Uint8Array(responseBuffer.attestationObject);

      // Send to server
      const enrollResponse = await fetch('/api/auth/fingerprint-enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credentialId: Array.from(new Uint8Array(credential.rawId)).map(b => b.toString(16).padStart(2, '0')).join(''),
          clientDataJSON: btoa(String.fromCharCode(...Array.from(clientDataJSON))),
          attestationObject: btoa(String.fromCharCode(...Array.from(attestationObject))),
        }),
        credentials: 'include',
      });

      if (!enrollResponse.ok) {
        const data = await enrollResponse.json();
        throw new Error(data.message || 'Failed to save fingerprint data');
      }

      setStatus('Fingerprint enrollment successful!');
      setTimeout(() => {
        onComplete();
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Fingerprint enrollment failed');
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900">
            {type === 'face' ? 'Face Enrollment' : 'Fingerprint Enrollment'}
          </h3>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {type === 'face' && (
          <div className="space-y-4">
            <div className="relative bg-gray-900 rounded-xl overflow-hidden aspect-video">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80">
                  <div className="text-white text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                    <p>Loading camera...</p>
                  </div>
                </div>
              )}
            </div>

            {enrollmentProgress > 0 && (
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${enrollmentProgress}%` }}
                />
              </div>
            )}

            {status && (
              <p className="text-sm text-gray-600 text-center">{status}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleFaceEnrollment}
                disabled={isLoading || isProcessing || !modelsReady}
                className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {isProcessing ? 'Processing...' : 'Start Enrollment'}
              </button>
              <button
                onClick={onCancel}
                disabled={isProcessing}
                className="px-4 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 disabled:opacity-50 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {type === 'fingerprint' && (
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-8 text-center">
              <div className="w-20 h-20 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04c.654-1.923 1.011-3.96 1.011-6.131 0-1.623-.277-3.18-.784-4.612M17.193 9.75c.585 1.923.907 3.96.907 6.131 0 1.623-.277 3.18-.784 4.612m-2.753-9.571c-1.744 2.772-4.753 4.571-8.193 4.571-3.44 0-6.449-1.799-8.193-4.571" />
                </svg>
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Fingerprint Authentication</h4>
              <p className="text-sm text-gray-600">
                Use your device&apos;s fingerprint sensor for quick and secure login
              </p>
            </div>

            {status && (
              <p className="text-sm text-gray-600 text-center">{status}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleFingerprintEnrollment}
                disabled={isLoading || isProcessing}
                className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {isProcessing ? 'Processing...' : 'Start Enrollment'}
              </button>
              <button
                onClick={onCancel}
                disabled={isProcessing}
                className="px-4 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 disabled:opacity-50 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

