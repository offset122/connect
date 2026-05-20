-- Create phone_number_requests table for storing phone number exchange requests
CREATE TABLE IF NOT EXISTS phone_number_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_status TEXT NOT NULL DEFAULT 'pending' CHECK (request_status IN ('pending', 'approved', 'declined')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(requester_id, target_user_id)
);

-- Enable RLS
ALTER TABLE phone_number_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own requests (as requester)
CREATE POLICY "Users can view their own requests as requester"
ON phone_number_requests FOR SELECT
USING (requester_id = auth.uid());

-- Policy: Users can view requests where they are the target
CREATE POLICY "Users can view requests where they are the target"
ON phone_number_requests FOR SELECT
USING (target_user_id = auth.uid());

-- Policy: Authenticated users can insert requests
CREATE POLICY "Authenticated users can insert requests"
ON phone_number_requests FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Policy: Users can update their own requests
CREATE POLICY "Users can update their own requests"
ON phone_number_requests FOR UPDATE
USING (requester_id = auth.uid() OR target_user_id = auth.uid())
WITH CHECK (requester_id = auth.uid() OR target_user_id = auth.uid());

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_phone_requests_requester ON phone_number_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_phone_requests_target ON phone_number_requests(target_user_id);
CREATE INDEX IF NOT EXISTS idx_phone_requests_status ON phone_number_requests(request_status);