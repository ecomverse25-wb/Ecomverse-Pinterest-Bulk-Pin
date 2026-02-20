-- Create user_settings table if it doesn't exist
create table if not exists public.user_settings (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null default auth.uid (),
  gemini_api_key text null,
  replicate_api_key text null,
  imgbb_api_key text null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint user_settings_pkey primary key (id),
  constraint user_settings_user_id_fkey foreign key (user_id) references auth.users (id) on delete cascade,
  constraint user_settings_user_id_key unique (user_id)
) tablespace pg_default;

-- Enable RLS
alter table public.user_settings enable row level security;

-- Create policies
create policy "Users can view their own settings" on public.user_settings
  for select using (auth.uid() = user_id);

create policy "Users can insert their own settings" on public.user_settings
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own settings" on public.user_settings
  for update using (auth.uid() = user_id);

-- Add to publication for realtime if needed
alter publication supabase_realtime add table public.user_settings;
