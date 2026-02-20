-- 1. Ensure the counters exist in the profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pins_created INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS api_calls INTEGER DEFAULT 0;

-- 2. Create the Atomic Increment Function (RPC)
-- This avoids race conditions where two updates happen at the same time
CREATE OR REPLACE FUNCTION increment_profile_stat(user_id_param UUID, col_name TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF col_name = 'pins_created' THEN
    UPDATE profiles 
    SET pins_created = COALESCE(pins_created, 0) + 1,
        last_active = NOW()
    WHERE id = user_id_param;
  ELSIF col_name = 'api_calls' THEN
    UPDATE profiles 
    SET api_calls = COALESCE(api_calls, 0) + 1,
        last_active = NOW()
    WHERE id = user_id_param;
  END IF;
END;
$$;

-- 3. Backfill/Repair Data (Recalculate counts from activities log)
WITH pin_counts AS (
    SELECT user_id, COUNT(*) as count 
    FROM activities 
    WHERE type = 'pin_created' 
    GROUP BY user_id
),
api_counts AS (
    SELECT user_id, COUNT(*) as count 
    FROM activities 
    WHERE type = 'api_call' 
    GROUP BY user_id
)
UPDATE profiles
SET 
    pins_created = COALESCE((SELECT count FROM pin_counts WHERE pin_counts.user_id = profiles.id), 0),
    api_calls = COALESCE((SELECT count FROM api_counts WHERE api_counts.user_id = profiles.id), 0);
