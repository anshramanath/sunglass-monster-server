-- ============================================================
-- 005_prescription_frames.sql
-- Prescription frames catalog + rx orders
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

create table rx_orders (
  id                    uuid        primary key default gen_random_uuid(),
  brand_slug            text        not null references brands(slug) on delete cascade,
  user_id               uuid        references auth.users(id) on delete set null,
  frame_name            text        not null,
  frame_slug            text        not null,
  frame_image_src       text        not null,
  frame_price_cents     int         not null,
  frame_color_slug      text        not null,
  deposit_used_cents    int,
  charge_cents          int         not null,
  status                text        not null,
  stripe_session_id     text,
  stripe_payment_intent text,
  form_hash             text        not null,
  vision_type           text        not null,
  od_sphere             text        not null,
  od_cylinder           text        not null,
  od_axis               text        not null,
  os_sphere             text        not null,
  os_cylinder           text        not null,
  os_axis               text        not null,
  pd_mode               text        not null,
  pd                    text        not null,
  pd_left               text        not null,
  pd_right              text        not null,
  lens_material         text        not null,
  lens_color_category   text        not null,
  lens_color            text        not null,
  ar_coating            text        not null,
  scratch_coating       text        not null,
  mirror_coating        text        not null,
  comments              text        not null,
  prescription_url      text        not null,
  headshot_url          text        not null,
  contact_name          text        not null,
  contact_email         text        not null,
  contact_phone         text        not null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create unique index rx_orders_form_hash_unpaid
  on rx_orders (form_hash) where status = 'Unpaid';

alter table rx_orders enable row level security;
grant select on rx_orders to authenticated;

create policy "rx_orders: users read own"
  on rx_orders for select using (auth.uid() = user_id);
