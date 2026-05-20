-- ─────────────────────────────────────────────────────────────────────────────
-- Storage RLS policies for the "media" bucket (chat photos & documents)
--
-- Run this once in the Supabase SQL Editor:
--   https://supabase.com/dashboard/project/<your-project>/sql/new
--
-- The "media" bucket must already exist.  If it does not, create it first:
--   INSERT INTO storage.buckets (id, name, public)
--   VALUES ('media', 'media', true)
--   ON CONFLICT (id) DO NOTHING;
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Make sure the bucket exists and is public (so media_url links work)
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. DROP any old / conflicting policies first (safe to re-run)
DROP POLICY IF EXISTS "Authenticated users can upload own chat media"   ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read chat media"         ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete own chat media"   ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update own chat media"   ON storage.objects;

-- 3. INSERT — users may only upload into their own top-level folder
--    Path pattern: {auth.uid()}/messages/{image|document}/{filename}
CREATE POLICY "Authenticated users can upload own chat media"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'media'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 4. SELECT — any authenticated user can read media (needed to display images)
CREATE POLICY "Authenticated users can read chat media"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'media');

-- 5. DELETE — users can only delete their own files
CREATE POLICY "Authenticated users can delete own chat media"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'media'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 6. UPDATE (for upsert support)
CREATE POLICY "Authenticated users can update own chat media"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'media'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'media'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
