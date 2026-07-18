-- Daily usage quota for the match-file analysis feature.
-- Enforced server-side by the analyze-match-file edge function (service role);
-- the client only displays the counters. One row per user per UTC day.
--   uploads   — count of file scans started today (limit 2/day)
--   analyses  — { <file_key>: count } full analyses per file today (limit 2/file/day)
--   questions — { <file_key>: count } deep-dive questions per file today (limit 3/file/day)
create table if not exists public.file_analysis_usage (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  day        date not null,
  uploads    integer not null default 0,
  analyses   jsonb   not null default '{}'::jsonb,
  questions  jsonb   not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (user_id, day)
);

-- Only the edge function (service role) touches this table.
alter table public.file_analysis_usage enable row level security;
