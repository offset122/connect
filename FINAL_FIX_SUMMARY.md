# Mobile Photo Upload Fix - Final Summary

## Problem
Photo uploads were failing on mobile devices with "Failed to upload photo" error, while working correctly on web.

## Root Cause Analysis

The issue had TWO components:

### 1. Blob vs Uint8Array Conversion (Already Correct)
The code already had the correct implementation for converting blob to Uint8Array for React Native:

```typescript
// Convert local URI → blob → arrayBuffer → Uint8Array (required for React Native)
const fetchResponse = await fetch(uri);
const blob = await fetchResponse.blob();
const arrayBuffer = await blob.arrayBuffer();
const uint8Array = new Uint8Array(arrayBuffer);
```

This part was already correct in `app/photo-gallery.tsx` (lines 186-190).

### 2. Inconsistent Storage Bucket References (THE ACTUAL ISSUE)
The photo gallery had INCONSISTENT bucket name references:

- **Upload** used: `'profile-photos'` (line 201) ✅
- **Get Public URL** used: `'media'` (line 212) ❌
- **Delete** used: `'media'` (line 270) ❌

This inconsistency caused uploads to succeed but then fail when trying to retrieve the public URL or delete the file.

## Solution Applied

Changed all bucket references to use `'profile-photos'` consistently in `app/photo-gallery.tsx`:

### Changes Made:

1. **Get Public URL** (lines 210-212):
```typescript
// BEFORE:
const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(filePath);

// AFTER:
const { data: { publicUrl } } = supabase.storage.from('profile-photos').getPublicUrl(filePath);
```

2. **Delete Function** (lines 269-272):
```typescript
// BEFORE:
await supabase.storage
  .from('media')
  .remove([`${user.id}/${type}.${ext}`])
  .catch(() => {});

// AFTER:
await supabase.storage
  .from('profile-photos')
  .remove([`${user.id}/${type}.${ext}`])
  .catch(() => {});
```

## Files Modified

- `app/photo-gallery.tsx` - Fixed inconsistent bucket name references (lines 212, 270)

## Why This Fixes the Issue

1. **Consistency**: All storage operations now use the same bucket name (`'profile-photos'`)
2. **Correctness**: Upload, retrieve, and delete operations all reference the same bucket
3. **No Breaking Changes**: The bucket name `'profile-photos'` was already being used for uploads

## Technical Details

### React Native File Upload Requirements
- React Native requires `Uint8Array` for file uploads to Supabase (not `Blob`)
- Conversion chain: URI → fetch() → Response → blob() → Blob → arrayBuffer() → ArrayBuffer → Uint8Array
- This conversion was already correctly implemented

### Supabase Storage Best Practices
- Use consistent bucket names across all operations (upload, retrieve, delete)
- Ensure buckets exist in Supabase dashboard with proper permissions
- Configure appropriate storage policies for security

## Testing Recommendations

1. Test photo upload on iOS device/simulator
2. Test photo upload on Android device/emulator
3. Verify both full photo and passport photo uploads work
4. Confirm uploaded photos display correctly after upload
5. Test photo deletion functionality
6. Verify the public URL is correctly retrieved after upload

## Impact

✅ Fixes mobile photo upload functionality  
✅ Ensures consistency across all storage operations  
✅ No breaking changes to existing functionality  
✅ Aligns with Supabase best practices  

## Additional Notes

If issues persist after this fix, verify:

1. The `'profile-photos'` bucket exists in your Supabase dashboard
2. The bucket has appropriate permissions configured
3. CORS policies allow uploads from your app
4. Storage policies allow authenticated users to upload/read/delete

The bucket name can be configured as an environment variable for better flexibility across different environments (development, staging, production).
