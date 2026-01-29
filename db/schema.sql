-- Neon/Postgres schema for UNV camera analytics
-- Requires DATABASE_URL to point at your Neon project.

create extension if not exists pgcrypto;

create table if not exists cameras (
  id uuid primary key default gen_random_uuid(),
  ip text not null unique,
  name text,
  device_type text,
  zone text,
  created_at timestamptz not null default now()
);

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  password_hash text not null,
  role text not null check (role in ('admin', 'user')),
  created_at timestamptz not null default now()
);

create table if not exists channels (
  id uuid primary key default gen_random_uuid(),
  camera_id uuid not null references cameras(id) on delete cascade,
  channel_no smallint not null,
  name text,
  zone text,
  features text[],
  capabilities jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (camera_id, channel_no)
);

create table if not exists people_count_events (
  id uuid primary key default gen_random_uuid(),
  camera_id uuid not null references cameras(id) on delete cascade,
  channel_no smallint not null,
  line_id smallint,
  object_in integer not null default 0,
  object_out integer not null default 0,
  event_time timestamptz not null,
  raw_payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_people_count_camera_channel_time
  on people_count_events (camera_id, channel_no, event_time desc);

create table if not exists face_events (
  id uuid primary key default gen_random_uuid(),
  camera_id uuid not null references cameras(id) on delete cascade,
  channel_no smallint not null,
  event_time timestamptz not null,
  faces_detected integer not null default 0,
  raw_payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_face_events_camera_channel_time
  on face_events (camera_id, channel_no, event_time desc);

create table if not exists face_attributes (
  id uuid primary key default gen_random_uuid(),
  face_event_id uuid not null references face_events(id) on delete cascade,
  face_id text,
  age integer,
  age_range text,
  gender text,
  glasses text,
  mask text,
  extra jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_face_attributes_event
  on face_attributes (face_event_id);
