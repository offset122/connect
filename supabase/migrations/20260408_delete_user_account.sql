-- Create a PostgreSQL function to delete a user account and all associated data
CREATE OR REPLACE FUNCTION public.delete_user_account(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_auth_id UUID;
BEGIN
    -- Get the auth_id from the users table
    SELECT auth_id INTO v_auth_id
    FROM public.users
    WHERE id = p_user_id;

    IF v_auth_id IS NULL THEN
        RAISE EXCEPTION 'User not found';
    END IF;

    -- ❌ Prevent admin accounts from being deleted at database level
    IF EXISTS (SELECT 1 FROM public.users WHERE id = p_user_id AND is_admin = true) THEN
        RAISE EXCEPTION 'Administrator accounts cannot be deleted';
    END IF;

    -- Delete user notifications
    DELETE FROM public.notifications
    WHERE user_id = p_user_id OR related_user_id = p_user_id;

    -- Delete phone number requests
    DELETE FROM public.phone_number_requests
    WHERE requester_id = p_user_id OR target_user_id = p_user_id;

    -- Delete photo requests
    DELETE FROM public.photo_requests
    WHERE requester_id = p_user_id OR target_user_id = p_user_id;

    -- Delete connections
    DELETE FROM public.connections
    WHERE requester_id = p_user_id OR recipient_id = p_user_id;

    -- Delete user profile
    DELETE FROM public.users
    WHERE id = p_user_id;

    -- Delete auth user (requires superuser privileges)
    -- This will be handled by the application using service role
    -- DELETE FROM auth.users WHERE id = v_auth_id;

    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to delete user account: %', SQLERRM;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.delete_user_account(UUID) TO authenticated;

-- Create policy to allow users to delete only their own account
DROP POLICY IF EXISTS "Users can delete their own account" ON public.users;
CREATE POLICY "Users can delete their own account"
ON public.users
FOR DELETE
TO authenticated
USING (auth_id = auth.uid());
