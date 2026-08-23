-- ============================================================
-- 002_user_cart_bookmarks.sql
-- Per-user cart and bookmark tables, scoped per brand
-- ============================================================

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
  quantity      int         not null
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
  image_src     text        not null
);

alter table bookmarks enable row level security;
grant select, insert, update, delete on bookmarks to authenticated;

create policy "bookmarks: users manage own rows"
  on bookmarks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
