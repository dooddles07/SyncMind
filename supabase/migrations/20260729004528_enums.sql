-- Defensive: Supabase projects have pgcrypto enabled by default, but this removes
-- any doubt about gen_random_uuid() availability for the tables that follow.
create extension if not exists pgcrypto;

create type meeting_status as enum (
  'draft', 'uploading', 'transcribing', 'analyzing',
  'ready', 'failed', 'quota_blocked'
);

create type chunk_status as enum ('pending', 'uploaded', 'processing', 'done', 'failed');

create type action_status as enum ('todo', 'in_progress', 'done');

create type action_priority as enum ('low', 'medium', 'high');

create type email_tone as enum ('professional', 'friendly', 'brief');
