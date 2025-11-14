# Face Login Setup Guide

## Overview

Face login has been integrated into the Nurse Pro Academy platform using face-api.js. This allows users to enroll their face and login using facial recognition.

## Installation

### 1. Install Required Package

```bash
npm install face-api.js
```

### 2. Download Face Recognition Models

You need to download the face-api.js models and place them in the `public/models` directory.

**Option A: Manual Download**
1. Go to: https://github.com/justadudewhohacks/face-api.js-models
2. Download the following models:
   - `tiny_face_detector_model-weights_manifest.json`
   - `tiny_face_detector_model-shard1`
   - `face_landmark_68_model-weights_manifest.json`
   - `face_landmark_68_model-shard1`
   - `face_recognition_model-weights_manifest.json`
   - `face_recognition_model-shard1`
3. Create `public/models` directory
4. Place all files in `public/models/`

**Option B: Using Script (Recommended)**

Create a script to download models automatically:

```bash
# Create models directory
mkdir -p public/models

# Download models (using curl or wget)
cd public/models
curl -O https://raw.githubusercontent.com/justadudewhohacks/face-api.js-models/master/tiny_face_detector_model-weights_manifest.json
curl -O https://raw.githubusercontent.com/justadudewhohacks/face-api.js-models/master/tiny_face_detector_model-shard1
curl -O https://raw.githubusercontent.com/justadudewhohacks/face-api.js-models/master/face_landmark_68_model-weights_manifest.json
curl -O https://raw.githubusercontent.com/justadudewhohacks/face-api.js-models/master/face_landmark_68_model-shard1
curl -O https://raw.githubusercontent.com/justadudewhohacks/face-api.js-models/master/face_recognition_model-weights_manifest.json
curl -O https://raw.githubusercontent.com/justadudewhohacks/face-api.js-models/master/face_recognition_model-shard1
```

### 3. Update .gitignore

Add models to .gitignore (they're large files):

```
public/models/*.shard1
```

## Usage

### Enrolling Face (First Time)

1. User logs in with email/password
2. Go to Profile Settings
3. Enable "Face ID Authentication"
4. Camera will open
5. User positions face in frame
6. Click "Capture Face"
7. Face template is saved to database

### Logging In with Face

1. On login page, click "Login with Face"
2. Enter email
3. Camera opens
4. Position face in frame
5. System verifies face matches enrolled template
6. If match, user is logged in

## API Endpoints

### POST `/api/auth/face-enroll`
Enroll user's face (requires authentication)

**Request:**
```json
{
  "descriptor": [0.123, 0.456, ...] // Float32Array as array
}
```

**Response:**
```json
{
  "message": "Face enrolled successfully",
  "success": true
}
```

### POST `/api/auth/face-login`
Login using face recognition

**Request:**
```json
{
  "email": "user@example.com",
  "descriptor": [0.123, 0.456, ...] // Float32Array as array
}
```

**Response:**
```json
{
  "message": "Face login successful",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "user@example.com",
    "role": "student"
  }
}
```

## Security Considerations

1. **Face Templates**: Stored as base64-encoded Float32Array in database
2. **Verification Threshold**: Set to 0.5 (adjustable in `face-recognition.ts`)
3. **Liveness Detection**: Basic checks (face size, position)
4. **Fallback**: Users can always use password login
5. **Privacy**: Face templates are encrypted at rest (recommended)

## Browser Support

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ⚠️ Limited (may need additional configuration)
- Mobile: ✅ Supported (iOS Safari, Chrome Android)

## Troubleshooting

### Models Not Loading
- Check that models are in `public/models/`
- Verify file names match exactly
- Check browser console for errors
- Ensure CORS is configured correctly

### Camera Not Accessing
- Check browser permissions
- Ensure HTTPS (required for camera access)
- Try different browser
- Check camera is not in use by another app

### Face Not Detected
- Ensure good lighting
- Face camera directly
- Remove glasses/hats if possible
- Check camera resolution settings

### Verification Fails
- Adjust threshold in `face-recognition.ts`
- Ensure same lighting conditions
- Try re-enrolling face
- Check face is clearly visible

## Advanced Configuration

### Adjusting Detection Threshold

Edit `src/lib/face-recognition.ts`:

```typescript
const threshold = 0.5; // Lower = stricter, Higher = more lenient
```

### Changing Model Size

For better accuracy (but slower), use larger models:

```typescript
// Instead of tiny_face_detector, use:
faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL)
```

### Adding Liveness Detection

Implement additional checks:
- Blink detection
- Head movement
- 3D face detection

## Production Recommendations

1. **Use HTTPS**: Required for camera access
2. **Server-Side Verification**: Process face verification server-side for security
3. **Rate Limiting**: Add rate limiting to face login endpoint
4. **Audit Logging**: Log all face login attempts
5. **Encryption**: Encrypt face templates at rest
6. **Backup**: Regular backups of face templates
7. **Compliance**: Ensure GDPR/privacy compliance for biometric data

## Alternative: MediaPipe Face Detection

If face-api.js doesn't work well, consider using Google's MediaPipe:

```bash
npm install @mediapipe/face_detection @mediapipe/drawing_utils
```

MediaPipe offers:
- Better performance
- More accurate detection
- Better mobile support
- No model files needed

## Support

For issues or questions:
1. Check browser console for errors
2. Verify all models are downloaded
3. Test in different browsers
4. Check camera permissions

