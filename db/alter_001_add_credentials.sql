alter table cameras
  add column if not exists username text,
  add column if not exists password_ciphertext text,
  add column if not exists password_iv text,
  add column if not exists password_tag text,
  add column if not exists updated_at timestamptz not null default now();

alter table channels
  add column if not exists features text[],
  add column if not exists capabilities jsonb,
  add column if not exists updated_at timestamptz not null default now();
