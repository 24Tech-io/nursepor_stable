/**
 * Simple Face Authentication
 * Uses native browser APIs for reliable face capture without external dependencies
 * No models to download, works everywhere!
 */

'use client';

/**
 * Check if browser supports required APIs
 */
export function checkBrowserSupport(): { supported: boolean; errors: string[] } {
  const errors: string[] = [];

  if (typeof window === 'undefined') {
    return { supported: false, errors: ['Not in browser environment'] };
  }

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    errors.push('Camera access not supported in this browser');
  }

  if (!window.HTMLCanvasElement) {
    errors.push('Canvas API not supported');
  }

  return {
    supported: errors.length === 0,
    errors,
  };
}

/**
 * Capture image from video stream
 */
export async function captureImageFromVideo(
  videoElement: HTMLVideoElement
): Promise<string | null> {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    // Draw current video frame
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

    // Convert to base64 image
    const imageData = canvas.toDataURL('image/jpeg', 0.8);
    return imageData;
  } catch (error) {
    console.error('Failed to capture image:', error);
    return null;
  }
}

/**
 * Simple face detection using basic image analysis
 * Checks if image has face-like features (contrast, brightness, etc.)
 */
export async function detectFaceInImage(imageData: string): Promise<boolean> {
  try {
    // Create image from data
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = imageData;
    });

    // Create canvas for analysis
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;

    ctx.drawImage(img, 0, 0);

    // Get image data for analysis
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = pixels.data;

    // Simple checks for face-like features
    let darkPixels = 0;
    let lightPixels = 0;
    let midPixels = 0;

    for (let i = 0; i < data.length; i += 4) {
      const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
      
      if (brightness < 85) darkPixels++;
      else if (brightness > 170) lightPixels++;
      else midPixels++;
    }

    const totalPixels = data.length / 4;
    
    // A face typically has good contrast (not too dark, not too bright)
    const hasGoodContrast = 
      (darkPixels / totalPixels > 0.1 && darkPixels / totalPixels < 0.4) &&
      (lightPixels / totalPixels > 0.1 && lightPixels / totalPixels < 0.4) &&
      (midPixels / totalPixels > 0.3);

    return hasGoodContrast;
  } catch (error) {
    console.error('Face detection error:', error);
    return false;
  }
}

/**
 * Extract simple face features for comparison
 * This is a simplified version that works without ML models
 */
export async function extractFaceFeatures(imageData: string): Promise<number[] | null> {
  try {
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = imageData;
    });

    const canvas = document.createElement('canvas');
    // Resize to standard size for comparison
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(img, 0, 0, 128, 128);

    // Extract features as normalized pixel values
    const imageData128 = ctx.getImageData(0, 0, 128, 128);
    const features: number[] = [];

    // Sample every 4th pixel to create a compact feature vector
    for (let i = 0; i < imageData128.data.length; i += 16) {
      const brightness = (
        imageData128.data[i] +
        imageData128.data[i + 1] +
        imageData128.data[i + 2]
      ) / 3;
      features.push(brightness / 255); // Normalize to 0-1
    }

    return features;
  } catch (error) {
    console.error('Feature extraction error:', error);
    return null;
  }
}

/**
 * Compare two face feature vectors
 * Returns similarity score (0-1, higher is more similar)
 */
export function compareFaceFeatures(features1: number[], features2: number[]): number {
  if (features1.length !== features2.length) {
    return 0;
  }

  // Calculate Euclidean distance
  let sumSquaredDiff = 0;
  for (let i = 0; i < features1.length; i++) {
    const diff = features1[i] - features2[i];
    sumSquaredDiff += diff * diff;
  }

  const distance = Math.sqrt(sumSquaredDiff);
  const maxDistance = Math.sqrt(features1.length); // Maximum possible distance

  // Convert to similarity (0-1, higher is better)
  const similarity = 1 - (distance / maxDistance);

  return similarity;
}

/**
 * Enroll face - capture and store face features
 */
export async function enrollFace(
  videoElement: HTMLVideoElement
): Promise<{ success: boolean; features?: number[]; imageData?: string; error?: string }> {
  try {
    // Check browser support
    const support = checkBrowserSupport();
    if (!support.supported) {
      return { success: false, error: support.errors.join(', ') };
    }

    // Capture image
    const imageData = await captureImageFromVideo(videoElement);
    if (!imageData) {
      return { success: false, error: 'Failed to capture image' };
    }

    // Detect face
    const hasFace = await detectFaceInImage(imageData);
    if (!hasFace) {
      return { success: false, error: 'No face detected. Please ensure good lighting and face the camera.' };
    }

    // Extract features
    const features = await extractFaceFeatures(imageData);
    if (!features) {
      return { success: false, error: 'Failed to extract face features' };
    }

    return {
      success: true,
      features,
      imageData,
    };
  } catch (error: any) {
    console.error('Face enrollment error:', error);
    return {
      success: false,
      error: error.message || 'Face enrollment failed',
    };
  }
}

/**
 * Verify face - compare captured face with stored features
 */
export async function verifyFace(
  videoElement: HTMLVideoElement,
  storedFeatures: number[]
): Promise<{ success: boolean; similarity?: number; error?: string }> {
  try {
    // Capture and extract features from current frame
    const imageData = await captureImageFromVideo(videoElement);
    if (!imageData) {
      return { success: false, error: 'Failed to capture image' };
    }

    const hasFace = await detectFaceInImage(imageData);
    if (!hasFace) {
      return { success: false, error: 'No face detected' };
    }

    const currentFeatures = await extractFaceFeatures(imageData);
    if (!currentFeatures) {
      return { success: false, error: 'Failed to extract face features' };
    }

    // Compare features
    const similarity = compareFaceFeatures(currentFeatures, storedFeatures);

    // Threshold for matching (0.7 = 70% similarity)
    const threshold = 0.7;
    const matched = similarity >= threshold;

    return {
      success: matched,
      similarity,
      error: matched ? undefined : 'Face does not match. Please try again.',
    };
  } catch (error: any) {
    console.error('Face verification error:', error);
    return {
      success: false,
      error: error.message || 'Face verification failed',
    };
  }
}

/**
 * Initialize camera stream
 */
export async function initializeCamera(): Promise<MediaStream | null> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 640 },
        height: { ideal: 480 },
        facingMode: 'user',
      },
    });
    return stream;
  } catch (error: any) {
    console.error('Camera initialization error:', error);
    return null;
  }
}

/**
 * Stop camera stream
 */
export function stopCamera(stream: MediaStream): void {
  stream.getTracks().forEach((track) => track.stop());
}

