-- ============================================================
-- 004_tbyb.sql
-- Try Before You Buy: packages + submissions
-- ============================================================

create table tbyb_packages (
  id          uuid primary key default gen_random_uuid(),
  brand_slug  text not null references brands(slug) on delete cascade,
  name        text not null,
  slug        text not null unique,
  price_cents int  not null,
  image_src   text not null,
  pairs_min   int  not null,
  pairs_max   int  not null,
  brands      text[] not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table tbyb_submissions (
  id                uuid        primary key default gen_random_uuid(),
  brand_slug        text        not null references brands(slug) on delete cascade,
  user_id           uuid        references auth.users(id) on delete set null,
  package_name      text,
  package_slug      text,
  package_price_cents int,
  package_image_src text,
  package_pairs_min int,
  package_pairs_max int,
  package_brands    text[],
  od_sphere         text,
  od_cylinder       text,
  od_axis           text,
  os_sphere         text,
  os_cylinder       text,
  os_axis           text,
  lens_type         text,
  helmet_size       text,
  hat_size          text,
  nose_bridge       text,
  buying_preference text,
  frame_type        text,
  special_requests  text,
  prescription_url  text,
  headshot_url      text,
  contact_email     text        not null,
  contact_phone     text,
  status            text        not null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table tbyb_packages   enable row level security;
alter table tbyb_submissions enable row level security;

grant select on tbyb_submissions to authenticated;

create policy "tbyb_submissions: users read own"
  on tbyb_submissions for select using (auth.uid() = user_id);

-- Seed packages (run after inserting the bikershades brand row)
insert into tbyb_packages (brand_slug, name, slug, price_cents, image_src, pairs_min, pairs_max, brands) values
  ('bikershades', 'BikerArmour',            'biker-armour',        22900, 'https://<supabase>/bikershades/packages/biker-armour.png',         3, 5,  array['BikerArmour']),
  ('bikershades', 'Wiley X',                'wiley-x',             24900, 'https://<supabase>/bikershades/packages/wiley-x.png',              3, 5,  array['Wiley X']),
  ('bikershades', '7Eye',                   '7eye',                24900, 'https://<supabase>/bikershades/packages/7eye.png',                 3, 5,  array['7Eye']),
  ('bikershades', 'BikerArmour + Wiley X',  'biker-armour-wileyx', 27900, 'https://<supabase>/bikershades/packages/biker-armour-wiley-x.png', 5, 8,  array['BikerArmour', 'Wiley X']),
  ('bikershades', 'BikerArmour + 7Eye',     'biker-armour-7eye',   27900, 'https://<supabase>/bikershades/packages/biker-armour-7eye.png',    5, 8,  array['BikerArmour', '7Eye']),
  ('bikershades', 'Triple Play',            'triple-play',         32900, 'https://<supabase>/bikershades/packages/triple-play.png',          7, 10, array['Wiley X', '7Eye', 'BikerArmour']),
  ('bikershades', '7Eye Ziena',             '7eye-ziena',          34900, 'https://<supabase>/bikershades/packages/7eye-ziena.png',           3, 3,  array['7Eye Ziena']);
