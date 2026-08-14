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
  package_name        text        not null,
  package_slug        text        not null,
  package_price_cents int         not null,
  package_image_src   text        not null,
  package_pairs_min   int         not null,
  package_pairs_max   int         not null,
  package_brands      text[]      not null,
  od_sphere           text        not null,
  od_cylinder         text        not null,
  od_axis             text        not null,
  os_sphere           text        not null,
  os_cylinder         text        not null,
  os_axis             text        not null,
  lens_type           text        not null,
  helmet_size         text        not null,
  hat_size            text        not null,
  nose_bridge         text        not null,
  buying_preference   text        not null,
  frame_type          text        not null,
  special_requests    text        not null,
  prescription_url    text        not null,
  headshot_url        text        not null,
  contact_name        text        not null,
  contact_email       text        not null,
  contact_phone       text        not null,
  status              text        not null,
  refunded_cents      int,
  form_hash           text        not null,
  stripe_session_id   text,
  stripe_payment_intent text,
  shipping_address    jsonb,
  carrier               text,
  tracking_number       text,
  deposit_cents         int,
  open_stripe_session_id text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create unique index tbyb_submissions_form_hash_unpaid
  on tbyb_submissions (form_hash) where status = 'Unpaid';

alter table tbyb_packages   enable row level security;
alter table tbyb_submissions enable row level security;

grant select on tbyb_submissions to authenticated;

create policy "tbyb_submissions: users read own"
  on tbyb_submissions for select using (auth.uid() = user_id);

-- Seed packages (run after inserting the bikershades brand row)
insert into tbyb_packages (brand_slug, name, slug, price_cents, image_src, pairs_min, pairs_max, brands) values
  ('bikershades', 'BikerArmour',                  'bikerarmour',            22900, 'https://zgcekcoatiskqbdruadg.supabase.co/storage/v1/object/public/bikershades/packages/bikerarmour.webp',         3, 5,  array['BikerArmour']),
  ('bikershades', 'Wiley X',                      'wiley-x',                24900, 'https://zgcekcoatiskqbdruadg.supabase.co/storage/v1/object/public/bikershades/packages/wileyx.webp',              3, 5,  array['Wiley X']),
  ('bikershades', '7Eye',                         '7eye',                   24900, 'https://zgcekcoatiskqbdruadg.supabase.co/storage/v1/object/public/bikershades/packages/7eye.webp',                3, 5,  array['7Eye']),
  ('bikershades', 'BikerArmour + Wiley X',        'bikerarmour-wiley-x',    27900, 'https://zgcekcoatiskqbdruadg.supabase.co/storage/v1/object/public/bikershades/packages/bikerarmour-wileyx.webp',  5, 8,  array['BikerArmour', 'Wiley X']),
  ('bikershades', 'BikerArmour + 7Eye',           'bikerarmour-7eye',       27900, 'https://zgcekcoatiskqbdruadg.supabase.co/storage/v1/object/public/bikershades/packages/bikerarmour-7eye.webp',    5, 8,  array['BikerArmour', '7Eye']),
  ('bikershades', 'BikerArmour + 7Eye + Wiley X', 'bikerarmour-7eye-wiley-x', 32900, 'https://zgcekcoatiskqbdruadg.supabase.co/storage/v1/object/public/bikershades/packages/bikerarmour-7eye-wileyx.webp', 7, 10, array['BikerArmour', '7Eye', 'Wiley X']),
  ('bikershades', '7Eye Ziena',                   '7eye-ziena',             34900, 'https://zgcekcoatiskqbdruadg.supabase.co/storage/v1/object/public/bikershades/packages/7eye.webp',                3, 3,  array['7Eye']);
