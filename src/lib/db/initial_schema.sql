-- ============================================================
-- initial_schema.sql
-- Full schema for sunglass monster multi-brand platform
-- Includes: core catalog, orders, cart, bookmarks, TBYB
-- ============================================================

create table brands (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique
);

create table categories (
  id uuid primary key default gen_random_uuid(),
  brand_slug text not null references brands(slug) on delete cascade,
  parent_id uuid references categories(id) on delete cascade,
  name text not null,
  slug text not null,
  sort_order int not null,
  view_count int default null
);

create table products (
  id uuid primary key default gen_random_uuid(),
  brand_slug text not null references brands(slug) on delete cascade,
  name text not null,
  slug text not null,
  sku text,
  description text not null,
  summary text[] not null,
  attributes jsonb not null,
  featured boolean not null,
  total_sales int,
  view_count int not null default 0,
  sale boolean not null,
  min_price_cents int not null,
  max_price_cents int not null,
  sale_price_cents int,
  unique (brand_slug, slug),
  unique (brand_slug, name)
);

create table product_categories (
  product_id uuid not null references products(id) on delete cascade,
  category_id uuid not null references categories(id) on delete cascade,
  primary key (product_id, category_id)
);

create table variations (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  sku text not null,
  attribute jsonb not null,
  sale boolean not null,
  regular_price_cents int not null,
  sale_price_cents int,
  total_sales int not null
);

create table product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  src text not null,
  name text not null,
  sort_order int not null
);

create table variation_images (
  id uuid primary key default gen_random_uuid(),
  variation_id uuid not null references variations(id) on delete cascade,
  src text not null,
  name text not null,
  sort_order int not null
);

create table description_images (
  id uuid primary key default gen_random_uuid(),
  brand_slug text not null references brands(slug) on delete cascade,
  src text not null,
  name text not null,
  unique (brand_slug, src)
);

create table product_description_images (
  product_id uuid not null references products(id) on delete cascade,
  image_id uuid not null references description_images(id) on delete cascade,
  primary key (product_id, image_id)
);

create table orders (
  id                    uuid        primary key default gen_random_uuid(),
  user_id               uuid        references auth.users(id) on delete set null,
  brand_slug            text        not null references brands(slug) on delete cascade,
  stripe_session_id     text        not null unique,
  stripe_payment_intent text not null unique,
  status                text        not null,
  total_cents           int         not null,
  refunded_cents        int,
  carrier               text,
  tracking_number       text,
  shipping_address      jsonb       not null,
  created_at            timestamptz not null default now()
);

alter table orders enable row level security;
grant select on orders to authenticated;

create policy "orders: users read own rows"
  on orders for select
  using (auth.uid() = user_id);


create table order_items (
  id            uuid  primary key default gen_random_uuid(),
  order_id      uuid  not null references orders(id) on delete cascade,
  product_slug  text  not null,
  sku           text  not null,
  name          text  not null,
  image_src     text  not null,
  price_cents   int   not null,
  quantity      int   not null,
  attribute     text
);

alter table order_items enable row level security;
grant select on order_items to authenticated;

create policy "order_items: users read own rows"
  on order_items for select
  using (exists (
    select 1 from orders
    where orders.id = order_items.order_id
      and orders.user_id = auth.uid()
  ));


create table admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

create table cart_items (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references auth.users(id) on delete cascade,
  brand_slug    text        not null references brands(slug) on delete cascade,
  product_id    uuid        not null references products(id) on delete cascade,
  product_slug  text        not null,
  sku           text        not null,
  attribute     jsonb       not null,
  name          text        not null,
  image_src     text        not null,
  price_cents   int         not null,
  quantity      int         not null,
  updated_at    timestamptz not null default now()
);

alter table cart_items enable row level security;
grant select, insert, update, delete on cart_items to authenticated;

create policy "cart_items: users manage own rows"
  on cart_items for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


create table bookmarks (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references auth.users(id) on delete cascade,
  brand_slug    text        not null references brands(slug) on delete cascade,
  product_id    uuid        not null references products(id) on delete cascade,
  product_slug  text        not null,
  name          text        not null,
  image_src     text        not null,
  created_at    timestamptz not null default now()
);

alter table bookmarks enable row level security;
grant select, insert, update, delete on bookmarks to authenticated;

create policy "bookmarks: users manage own rows"
  on bookmarks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


create or replace function update_total_sales()
returns trigger
language plpgsql
as $$
declare
  v_brand_slug text;
  v_variation_id uuid;
begin
  select brand_slug into v_brand_slug
  from orders where id = new.order_id;

  select v.id into v_variation_id
  from variations v
  join products p on p.id = v.product_id
  where p.slug = new.product_slug
    and p.brand_slug = v_brand_slug
    and v.sku = new.sku;

  if v_variation_id is not null then
    update variations set total_sales = total_sales + new.quantity where id = v_variation_id;
  else
    update products set total_sales = total_sales + new.quantity
    where slug = new.product_slug and brand_slug = v_brand_slug and sku = new.sku;
  end if;

  return new;
end;
$$;

create trigger order_items_update_total_sales
  after insert on order_items
  for each row execute function update_total_sales();


create or replace function decrement_total_sales_on_refund()
returns trigger
language plpgsql
as $$
declare
  v_item record;
  v_variation_id uuid;
begin
  if coalesce(new.refunded_cents, 0) <= 0 then
    return new;
  end if;
  if old.refunded_cents > 0 then
    return new;
  end if;

  for v_item in
    select product_slug, sku, quantity from order_items where order_id = new.id
  loop
    select v.id into v_variation_id
    from variations v
    join products p on p.id = v.product_id
    where p.slug = v_item.product_slug
      and p.brand_slug = new.brand_slug
      and v.sku = v_item.sku;

    if v_variation_id is not null then
      update variations set total_sales = total_sales - v_item.quantity where id = v_variation_id;
    else
      update products set total_sales = total_sales - v_item.quantity
      where slug = v_item.product_slug and brand_slug = new.brand_slug and sku = v_item.sku;
    end if;
  end loop;

  return new;
end;
$$;

create trigger orders_decrement_total_sales_on_refund
  after update on orders
  for each row execute function decrement_total_sales_on_refund();


create or replace function increment_category_view(p_id uuid, p_brand_slug text)
returns void language sql as $$
  update categories
  set view_count = coalesce(view_count, 0) + 1
  where id = p_id and brand_slug = p_brand_slug;
$$;

create or replace function increment_product_view(p_slug text, p_brand_slug text)
returns void language sql as $$
  update products
  set view_count = view_count + 1
  where slug = p_slug and brand_slug = p_brand_slug;
$$;


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
  id                  uuid        primary key default gen_random_uuid(),
  brand_slug          text        not null references brands(slug) on delete cascade,
  user_id             uuid        references auth.users(id) on delete set null,
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
  contact_phone         text        not null,
  status                text        not null,
  refunded_cents        int,
  form_hash             text        not null,
  stripe_session_id     text,
  stripe_payment_intent text,
  shipping_address      jsonb,
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
