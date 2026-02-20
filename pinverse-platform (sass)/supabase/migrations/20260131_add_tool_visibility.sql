-- Create tools table to manage global visibility
CREATE TABLE IF NOT EXISTS public.tools (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    is_globally_visible BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on tools
ALTER TABLE public.tools ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read tools (filtering happens in app logic or via RLS if strict)
DO $$
BEGIN
    DROP POLICY IF EXISTS "Everyone can read tools" ON public.tools;
    CREATE POLICY "Everyone can read tools" ON public.tools
        FOR SELECT USING (true);
END
$$;

-- Only admins can update tools
-- Note: You'll need to ensure your admin check logic (e.g. app_metadata or specific table) matches here.
-- For now, we'll allow service role (admin dashboard actions) to manage this.

-- Create user_tool_visibility table for per-user overrides
CREATE TABLE IF NOT EXISTS public.user_tool_visibility (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    tool_id TEXT REFERENCES public.tools(id) ON DELETE CASCADE,
    is_visible BOOLEAN NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, tool_id)
);

-- Enable RLS
ALTER TABLE public.user_tool_visibility ENABLE ROW LEVEL SECURITY;

-- Users can read their own visibility settings
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can read own visibility" ON public.user_tool_visibility;
    CREATE POLICY "Users can read own visibility" ON public.user_tool_visibility
        FOR SELECT
        USING (auth.uid() = user_id);
END
$$;

-- Admins/Service Role can manage all
DO $$
BEGIN
    DROP POLICY IF EXISTS "Admins can manage visibility" ON public.user_tool_visibility;
    CREATE POLICY "Admins can manage visibility" ON public.user_tool_visibility
        FOR ALL
        USING (true);
END
$$;

-- Seed initial tools (Using ON CONFLICT to avoid errors if they exist)
INSERT INTO public.tools (id, name, description, is_globally_visible)
VALUES 
    ('article-writer', 'PinVerse Master Writer', 'Turn keywords into SEO articles and Pinterest assets.', true),
    ('bulk-pin-creator', 'Bulk Pin Creator', 'Generate hundreds of Pinterest pins with AI.', true),
    ('pinterest-scheduler', 'Pinterest Scheduler', 'Schedule your pins for optimal posting times.', true),
    ('keyword-research', 'Keyword Research', 'Find high-traffic Pinterest keywords.', false), -- Hidden by default
    ('analytics', 'Analytics Dashboard', 'Track your Pinterest performance.', true)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description;
