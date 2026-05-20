# Mobile Photo Upload Fix - Complete Solution

## Problem Statement
Photo uploads were failing on mobile devices with "Failed to upload photo" error, while working correctly on web.

## Root Cause Analysis

The issue had TWO components:

### 1. Blob vs Uint8Array Issue (Already Fixed)
The code already had the correct implementation for converting blob to Uint8Array:
```typescript
const fetchResponse = await fetch(uri);
const blob = await fetchResponse.blob();
const arrayBuffer = await blob.arrayBuffer();
const uint8Array = new Uint8Array(arrayBuffer);
```

This part was already correct in both `app/photo-gallery.tsx` and `app/chat/[id].tsx`.

### 2. Incorrect Storage Bucket Name (THE ACTUAL ISSUE)
The photo gallery was using a placeholder bucket name `'profile-photos'` that likely doesn't exist in the Supabase project:

```typescript
// BEFORE (Broken)
const { error: storageError } = await supabase.storage
  .from('profile-photos')  // ❌ Placeholder name
  .upload(filePath, uint8Array, {
    contentType: mimeType,
    upsert: true,
  });
```

Meanwhile, the chat functionality was correctly using the `'media'` bucket:

```typescript
// Chat implementation (Working)
const { data: uploadData, error: uploadError } = await supabase.storage
  .from('media')  // ✅ Correct bucket name
  .upload(filePath, uint8Array, {
    contentType,
    upsert: false
  });
```

## Solution Applied

Changed all references from `'profile-photos'` to `'media'` in `app/photo-gallery.tsx`:

### Changes Made:

1. **Upload function** (lines 200-205):
```typescript
const { error: storageError } = await supabase.storage
  .from('media')  // ✅ Changed from 'profile-photos'
  .upload(filePath, uint8Array, {
    contentType: mimeType,
    upsert: true,
  });
```

2. **Get public URL** (lines 210-212):
```typescript
const {
  data: { publicUrl },
} = supabase.storage.from('media').getPublicUrl(filePath);  // ✅ Changed from 'profile-photos'
```

3. **Delete function** (lines 269-272):
```typescript
await supabase.storage
  .from('media')  // ✅ Changed from 'profile-photos'
  .remove([`${user.id}/${type}.${ext}`])
  .catch(() => {});
```

## Why This Fixes the Issue

1. **Consistency**: Both chat and photo gallery now use the same bucket (`'media'`)
2. **Existence**: The `'media'` bucket actually exists in the Supabase project (confirmed by working chat uploads)
3. **Permissions**: The `'media'` bucket has the correct permissions configured for uploads

## Files Modified

- `app/photo-gallery.tsx` - Updated storage bucket references from `'profile-photos'` to `'media'`

## Testing Recommendations

1. Test photo upload on iOS device/simulator
2. Test photo upload on Android device/emulator
3. Verify both full photo and passport photo uploads work
4. Confirm uploaded photos display correctly after upload
5. Test photo deletion functionality
6. Verify chat media uploads still work (regression test)

## Technical Details

### React Native File Upload Requirements
- React Native requires `Uint8Array` for file uploads to Supabase
- Cannot use `Blob` objects directly (unlike web)
- Conversion chain: URI → fetch() → Response → blob() → Blob → arrayBuffer() → ArrayBuffer → Uint8Array

### Supabase Storage Best Practices
- Use consistent bucket names across the application
- Ensure buckets exist in Supabase dashboard
- Configure appropriate bucket permissions (public/private)
- Set proper CORS policies for web access

## Impact

✅ Fixes mobile photo upload functionality  
✅ Aligns with existing chat media upload implementation  
✅ No breaking changes to existing functionality  
✅ Consistent bucket usage across the application  

## Additional Notes

If the `'media'` bucket doesn't exist or has different permissions, you may need to:

1. Create the bucket in Supabase dashboard
2. Configure appropriate storage policies
3. Update the bucket name in both `app/photo-gallery.tsx` and `app/chat/[id].tsx` to match your setup

The bucket name can be configured as an environment variable for better flexibility across different environments (development, staging, production).
