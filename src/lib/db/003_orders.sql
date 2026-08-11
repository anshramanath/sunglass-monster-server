-- ============================================================
-- 003_orders.sql
-- Adds orders and order_items tables
-- Users can read their own orders; writes are admin-only (webhook)
-- ============================================================

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
  veeqo_order_id        text        null,
  veeqo_error           text        null,
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
  attribute     text,
  unique (order_id, sku)
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
