-- Fix: function_search_path_mutable
-- Addressing: Function `public.handle_new_user` has a role mutable search_path
ALTER FUNCTION public.handle_new_user() SET search_path = public;

-- Fix: rls_policy_always_true AND multiple_permissive_policies
-- Addressing: Table `public.activities` has overly permissive policies
-- Strategy:
-- 1. Drop the permissive "Authenticated can insert" policy (which was likely "true")
-- 2. Re-create it with a proper check ensuring users can only insert their own activities
-- 3. Drop the "Anyone can read activities" policy to resolve the multiple policies conflict.
--    This assumes "Users can view their own activities" is the desired policy for SELECT.

-- Drop known bad/redundant policies
DROP POLICY IF EXISTS "Authenticated can insert" ON public.activities;
DROP POLICY IF EXISTS "Anyone can read activities" ON public.activities;

-- Re-create INSERT policy securely
CREATE POLICY "Authenticated can insert"
ON public.activities
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Verify/Ensure "Users can view their own activities" exists (Best effort idempotency)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'activities'
        AND policyname = 'Users can view their own activities'
    ) THEN
        CREATE POLICY "Users can view their own activities"
        ON public.activities
        FOR SELECT
        TO authenticated
        USING (auth.uid() = user_id);
    END IF;
END
$$;

-- Fix: unindexed_foreign_keys
-- Addressing: Missing indexes on foreign keys for performance
CREATE INDEX IF NOT EXISTS idx_activities_user_id ON public.activities(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_articles_user_id ON public.generated_articles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_keywords_user_id ON public.user_keywords(user_id);
CREATE INDEX IF NOT EXISTS idx_user_products_user_id ON public.user_products(user_id);
