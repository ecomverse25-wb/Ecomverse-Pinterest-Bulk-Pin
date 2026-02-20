-- Create the site_content table to store dynamic landing page data
CREATE TABLE IF NOT EXISTS site_content (
    section_key TEXT PRIMARY KEY, -- 'hero', 'features', 'pricing', 'testimonials', 'footer'
    content JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

-- Enable Row Level Security
ALTER TABLE site_content ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read content (Public)
CREATE POLICY "Public read access" ON site_content 
    FOR SELECT 
    USING (true);

-- Policy: Only Admins can update content
-- We assume an 'admin_users' table exists or we check specific emails.
-- Reusing the logic from other policies or simply trusting the application layer's admin check for now via RLS if possible.
-- For simplicity and consistency with previous patterns, we might rely on the checking logic in the Service Role or specific admin checks.
-- But proper RLS is better. Let's check if 'admin_users' exists or how we handle admins usually.
-- Previous middleware uses ADMIN_EMAILS env var.
-- The existing migrations might show how we handle admin RLS.
-- '20260128_create_admin_activities.sql' might give a clue if it exists (not seen in list).
-- '20260131_add_tool_visibility.sql' uses:
-- CREATE POLICY "Allow admins to update tools" ON tools FOR UPDATE TO authenticated USING (auth.jwt() ->> 'email' IN ('admin@pinverse.com', ...));
-- This is hardcoding in SQL which is brittle if env vars change.

-- BETTER APPROACH:
-- Since we are using Server Actions with `createAdminClient` (Service Role) for writing, 
-- we actually bypass RLS for writes in our admin actions.
-- So strictly speaking, we just need to ensure standard users CANNOT write.
-- We will create a policy that effectively disables writes for normal 'authenticated' users unless they are service role (which has bypass).
-- Actually, Service Role bypasses RLS completely, so we don't need a policy for it.
-- We just need to ensure NO ONE ELSE can write via the client API.

CREATE POLICY "Deny normal user write access" ON site_content
    FOR ALL
    TO authenticated
    USING (false)
    WITH CHECK (false);

-- If we ever wanted client-side admin writes, we'd need a robust check.
-- For now, Server Actions (Service Role) will handle updates.

-- Insert Default Data (Fallbacks encoded as initial rows if needed, or we handle in code)
-- Let's insert placeholders so the table isn't empty, ensuring fetching works immediately.
-- actually, code-level fallbacks are safer if DB is empty.
