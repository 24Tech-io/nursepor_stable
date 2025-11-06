# Face API Models Download Guide

## Quick Setup

The face-api.js models are required for face recognition to work. Follow these steps:

### Option 1: Manual Download (Recommended)

1. **Go to the GitHub repository:**
   - Visit: https://github.com/justadudewhohacks/face-api.js-models

2. **Download the following 6 files:**
   - `tiny_face_detector_model-weights_manifest.json`
   - `tiny_face_detector_model-shard1`
   - `face_landmark_68_model-weights_manifest.json`
   - `face_landmark_68_model-shard1`
   - `face_recognition_model-weights_manifest.json`
   - `face_recognition_model-shard1`

3. **Place them in the `public/models/` directory:**
   ```
   public/
     models/
       tiny_face_detector_model-weights_manifest.json
       tiny_face_detector_model-shard1
       face_landmark_68_model-weights_manifest.json
       face_landmark_68_model-shard1
       face_recognition_model-weights_manifest.json
       face_recognition_model-shard1
   ```

### Option 2: Direct Download Links

You can download each file directly:

1. **tiny_face_detector_model-weights_manifest.json**
   - https://raw.githubusercontent.com/justadudewhohacks/face-api.js-models/master/tiny_face_detector_model-weights_manifest.json

2. **tiny_face_detector_model-shard1**
   - https://raw.githubusercontent.com/justadudewhohacks/face-api.js-models/master/tiny_face_detector_model-shard1

3. **face_landmark_68_model-weights_manifest.json**
   - https://raw.githubusercontent.com/justadudewhohacks/face-api.js-models/master/face_landmark_68_model-weights_manifest.json

4. **face_landmark_68_model-shard1**
   - https://raw.githubusercontent.com/justadudewhohacks/face-api.js-models/master/face_landmark_68_model-shard1

5. **face_recognition_model-weights_manifest.json**
   - https://raw.githubusercontent.com/justadudewhohacks/face-api.js-models/master/face_recognition_model-weights_manifest.json

6. **face_recognition_model-shard1**
   - https://raw.githubusercontent.com/justadudewhohacks/face-api.js-models/master/face_recognition_model-shard1

### Option 3: Using Git (if you have Git installed)

```bash
cd public
git clone https://github.com/justadudewhohacks/face-api.js-models.git models
```

Then move the files from `public/models/face-api.js-models/` to `public/models/`

### Verification

After downloading, verify the files exist:
- Check that `public/models/` contains all 6 files
- Restart your Next.js dev server
- Try face login again

### Troubleshooting

If models still don't load:
1. Check browser console for specific errors
2. Verify file names match exactly (case-sensitive)
3. Ensure files are in `public/models/` (not `public/models/models/`)
4. Clear browser cache and reload
5. Check that Next.js dev server has access to the public folder

