# Photo Upload Fix for Mobile

## Problem
Photo upload was failing on mobile devices with "Failed to upload photo" error, while it worked correctly on web.

## Root Cause
The `uploadPhoto` function in `app/photo-gallery.tsx` was passing a `Blob` object directly to Supabase Storage's `upload()` method. However, on React Native (mobile), the Supabase JavaScript client requires `Uint8Array` or `ArrayBuffer` for file uploads, not `Blob`.

The chat upload functionality in `app/chat/[id].tsx` was already working correctly because it properly converted the blob to `Uint8Array` before uploading.

## Solution
Updated the `uploadPhoto` function in `app/photo-gallery.tsx` to convert the blob to `Uint8Array` before uploading, matching the pattern used in the chat upload:

### Before (Broken):
```typescript
// Convert local URI → blob
const fetchResponse = await fetch(uri);
const blob = await fetchResponse.blob();

// Upload to Supabase Storage
const { error: storageError } = await supabase.storage
  .from('profile-photos')
  .upload(filePath, blob, {  // ❌ Blob doesn't work on React Native
    contentType: mimeType,
    upsert: true,
  });
```

### After (Fixed):
```typescript
// Convert local URI → blob → arrayBuffer → Uint8Array (required for React Native)
const fetchResponse = await fetch(uri);
const blob = await fetchResponse.blob();
const arrayBuffer = await blob.arrayBuffer();
const uint8Array = new Uint8Array(arrayBuffer);

// Upload to Supabase Storage
const { error: storageError } = await supabase.storage
  .from('profile-photos')
  .upload(filePath, uint8Array, {  // ✅ Uint8Array works on all platforms
    contentType: mimeType,
    upsert: true,
  });
```

## Technical Details

### Why This Happens
- **Web**: The Supabase JS client can handle `Blob` objects natively in browser environments
- **React Native**: The Supabase JS client uses XMLHttpRequest/fetch under the hood, which requires binary data as `ArrayBuffer` or `Uint8Array`

### Consistency
This fix makes the photo upload code consistent with the chat media upload code in `app/chat/[id].tsx` (lines 469-472), which already uses the correct pattern:

```typescript
const response = await fetch(uri);
const blob = await response.blob();
const arrayBuffer = await blob.arrayBuffer();
const uint8Array = new Uint8Array(arrayBuffer);
```

## Files Modified
- `app/photo-gallery.tsx` - Updated `uploadPhoto` function (lines 186-206)

## Testing Recommendations
1. Test photo upload on iOS device/simulator
2. Test photo upload on Android device/emulator
3. Verify both full photo and passport photo uploads work
4. Confirm uploaded photos display correctly after upload
5. Test with different image formats (JPEG, PNG)

## Impact
- ✅ Fixes mobile photo upload functionality
- ✅ No breaking changes to existing functionality
- ✅ Aligns with existing working code patterns in the codebase
- ✅ No changes required to backend or database schema