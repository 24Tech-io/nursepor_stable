/**
 * Face Recognition Utilities
 * Uses face-api.js for face detection and recognition
 *
 * Installation: npm install face-api.js
 */

// Type definitions for face-api.js
type FaceDetection = any;
type FaceLandmarks = any;
type WithFaceDescriptor<T> = T & { descriptor: Float32Array };
type WithFaceLandmarks<T> = T & { landmarks: FaceLandmarks };

// Face recognition configuration
// Models should be in public/models/ directory
// Download from: https://github.com/justadudewhohacks/face-api.js-models
const MODEL_URL = '/models'; // Path to face-api.js models (relative to public folder)
const FACE_DETECTION_OPTIONS = {
  minConfidence: 0.5,
  maxResults: 1,
};

// Initialize face-api models
let modelsLoaded = false;
let faceapiModule: any = null;

export async function loadFaceModels(): Promise<boolean> {
  if (modelsLoaded) {
    return true;
  }

  try {
    // Dynamic import to avoid SSR issues
    faceapiModule = await import('face-api.js');
    const faceapi = faceapiModule.default || faceapiModule;

    console.log('Loading face recognition models from:', MODEL_URL);

    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);

    modelsLoaded = true;
    console.log('✓ Face recognition models loaded successfully');
    return true;
  } catch (error: any) {
    console.error('Failed to load face recognition models:', error);
    console.error('Error details:', {
      message: error?.message,
      stack: error?.stack,
    });

    // Provide helpful error message
    if (error?.message?.includes('404') || error?.message?.includes('Failed to fetch')) {
      console.error(`
        ⚠️  Models not found! Please download the face-api.js models:
        
        1. Run the download script:
           PowerShell: .\download-face-models.ps1
           Or manually download from: https://github.com/justadudewhohacks/face-api.js-models
        
        2. Place the models in: public/models/
        
        Required files:
        - tiny_face_detector_model-weights_manifest.json
        - tiny_face_detector_model-shard1
        - face_landmark_68_model-weights_manifest.json
        - face_landmark_68_model-shard1
        - face_recognition_model-weights_manifest.json
        - face_recognition_model-shard1
      `);
    }

    return false;
  }
}

/**
 * Detect face in image/video
 */
export async function detectFace(
  input: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement
): Promise<WithFaceDescriptor<
  WithFaceLandmarks<{
    detection: FaceDetection;
  }>
> | null> {
  try {
    if (!faceapiModule) {
      faceapiModule = await import('face-api.js');
    }
    const faceapi = faceapiModule.default || faceapiModule;

    if (!modelsLoaded) {
      await loadFaceModels();
    }

    const detection = await faceapi
      .detectSingleFace(input, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor();

    return detection;
  } catch (error) {
    console.error('Face detection error:', error);
    return null;
  }
}

/**
 * Enroll user face - capture and store face descriptor
 */
export async function enrollFace(videoElement: HTMLVideoElement): Promise<Float32Array | null> {
  try {
    const detection = await detectFace(videoElement);

    if (!detection) {
      throw new Error('No face detected. Please ensure your face is clearly visible.');
    }

    // Check if face is too far or too close (basic liveness check)
    const box = detection.detection.box;
    const area = box.width * box.height;
    const minArea = 10000; // Minimum face area
    const maxArea = 200000; // Maximum face area

    if (area < minArea) {
      throw new Error('Please move closer to the camera.');
    }
    if (area > maxArea) {
      throw new Error('Please move further from the camera.');
    }

    return detection.descriptor;
  } catch (error) {
    console.error('Face enrollment error:', error);
    throw error;
  }
}

/**
 * Verify face - compare with stored descriptor
 */
export async function verifyFace(
  videoElement: HTMLVideoElement,
  storedDescriptor: Float32Array
): Promise<{ match: boolean; distance: number }> {
  try {
    const detection = await detectFace(videoElement);

    if (!detection) {
      return { match: false, distance: Infinity };
    }

    if (!faceapiModule) {
      faceapiModule = await import('face-api.js');
    }
    const faceapi = faceapiModule.default || faceapiModule;

    const distance = faceapi.euclideanDistance(detection.descriptor, storedDescriptor);

    // Threshold for face match (lower = stricter)
    // Typical values: 0.4-0.6
    const threshold = 0.5;
    const match = distance < threshold;

    return { match, distance };
  } catch (error) {
    console.error('Face verification error:', error);
    return { match: false, distance: Infinity };
  }
}

/**
 * Convert Float32Array to base64 for storage
 */
export function descriptorToBase64(descriptor: Float32Array): string {
  const bytes = new Uint8Array(descriptor.buffer);
  const binary = String.fromCharCode(...Array.from(bytes));
  return btoa(binary);
}

/**
 * Convert base64 back to Float32Array
 */
export function base64ToDescriptor(base64: string): Float32Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Float32Array(bytes.buffer);
}

/**
 * Check if browser supports required APIs
 */
export function checkBrowserSupport(): {
  supported: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    errors.push('Camera access not supported');
  }

  if (typeof WebAssembly === 'undefined') {
    errors.push('WebAssembly not supported (required for face-api.js)');
  }

  return {
    supported: errors.length === 0,
    errors,
  };
}
