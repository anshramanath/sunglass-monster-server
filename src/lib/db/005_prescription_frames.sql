-- ============================================================
-- 005_prescription_frames.sql
-- Prescription frames catalog
-- ============================================================

create table prescription_frames (
  id          uuid        primary key default gen_random_uuid(),
  brand_slug  text        not null references brands(slug) on delete cascade,
  name        text        not null,
  slug        text        not null unique,
  image_src   text        not null,
  price_cents int         not null,
  size        text        not null,
  rx_low      numeric     not null,
  rx_high     numeric     not null,
  colors      jsonb       not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table prescription_frames enable row level security;
