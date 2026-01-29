alter table cameras
  add column if not exists device_type text,
  add column if not exists zone text;
