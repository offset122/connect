-- Check user photo upload status
SELECT 
  id,
  first_name,
  email,
  full_photo,
  passport_photo,
  CASE WHEN full_photo IS NOT NULL THEN '✓ Uploaded' ELSE '✗ Missing' END as full_photo_status,
  CASE WHEN passport_photo IS NOT NULL THEN '✓ Uploaded' ELSE '✗ Missing' END as passport_photo_status,
  updated_at
FROM users
ORDER BY updated_at DESC NULLS LAST;

-- Count users with photos
SELECT 
  COUNT(*) as total_users,
  COUNT(full_photo) as users_with_full_photo,
  COUNT(passport_photo) as users_with_passport_photo,
  COUNT(CASE WHEN full_photo IS NOT NULL AND passport_photo IS NOT NULL THEN 1 END) as users_with_both_photos
FROM users;

-- Storage bucket check (run in Supabase SQL Editor)
SELECT * FROM storage.buckets WHERE id = 'photos';

-- List objects in photos bucket
SELECT name, created_at, owner 
FROM storage.objects 
WHERE bucket_id = 'photos'
ORDER BY created_at DESC;
