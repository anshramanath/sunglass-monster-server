-- ============================================================
-- 006_save_product.sql
-- Atomic product save: product row + categories + images +
-- description images + variations + variation images.
-- Entire operation runs in one transaction — all or nothing.
-- ============================================================

alter table product_images add constraint product_images_product_id_src_key unique (product_id, src);
alter table variation_images add constraint variation_images_variation_id_src_key unique (variation_id, src);

create or replace function save_product(
  p_brand_slug          text,
  p_product_id          uuid,
  p_is_new              boolean,
  p_name                text,
  p_slug                text,
  p_sku                 text,
  p_description         text,
  p_summary             text[],
  p_attributes          jsonb,
  p_featured            boolean,
  p_sale                boolean,
  p_min_price_cents     int,
  p_max_price_cents     int,
  p_sale_price_cents    int,
  p_is_simple           boolean,
  p_category_ids        uuid[],
  p_images              jsonb,
  p_description_images  jsonb,
  p_variations          jsonb
) returns void language plpgsql as $$
declare
  v_var    jsonb;
  v_var_id uuid;
begin
  -- Product row
  if p_is_new then
    insert into products (
      id, brand_slug, name, slug, sku, description, summary, attributes,
      featured, sale, min_price_cents, max_price_cents, sale_price_cents, total_sales
    ) values (
      p_product_id, p_brand_slug, p_name, p_slug, p_sku, p_description, p_summary, p_attributes,
      p_featured, p_sale, p_min_price_cents, p_max_price_cents, p_sale_price_cents,
      case when p_is_simple then 0 else null end
    );
  else
    update products set
      name             = p_name,
      slug             = p_slug,
      sku              = p_sku,
      description      = p_description,
      summary          = p_summary,
      attributes       = p_attributes,
      featured         = p_featured,
      sale             = p_sale,
      min_price_cents  = p_min_price_cents,
      max_price_cents  = p_max_price_cents,
      sale_price_cents = p_sale_price_cents,
      -- simple: preserve existing total_sales; variable: force null
      total_sales      = case when p_is_simple then coalesce(total_sales, 0) else null end
    where id = p_product_id and brand_slug = p_brand_slug;
  end if;

  -- Categories: insert new, delete removed
  insert into product_categories (product_id, category_id)
  select p_product_id, unnest(p_category_ids)
  on conflict (product_id, category_id) do nothing;

  delete from product_categories
  where product_id = p_product_id
    and not (category_id = any(p_category_ids));

  -- Product images: upsert (insert or update sort_order), delete removed
  insert into product_images (product_id, src, name, sort_order)
  select p_product_id, img->>'src', img->>'name', (img->>'sort_order')::int
  from jsonb_array_elements(p_images) as img
  on conflict (product_id, src) do update set sort_order = excluded.sort_order;

  delete from product_images
  where product_id = p_product_id
    and src not in (select img->>'src' from jsonb_array_elements(p_images) as img);

  -- Description images: upsert shared rows (never delete them — other products may reference them)
  insert into description_images (brand_slug, src, name)
  select p_brand_slug, img->>'src', img->>'name'
  from jsonb_array_elements(p_description_images) as img
  on conflict (brand_slug, src) do nothing;

  -- Junctions: insert new, delete removed
  insert into product_description_images (product_id, image_id)
  select p_product_id, di.id
  from description_images di
  where di.brand_slug = p_brand_slug
    and di.src in (select img->>'src' from jsonb_array_elements(p_description_images) as img)
  on conflict (product_id, image_id) do nothing;

  delete from product_description_images pdi
  using description_images di
  where pdi.product_id = p_product_id
    and pdi.image_id = di.id
    and di.src not in (select img->>'src' from jsonb_array_elements(p_description_images) as img);

  -- Delete removed variations (empty p_variations = simple product = delete all)
  delete from variations
  where product_id = p_product_id
    and id not in (
      select (v->>'id')::uuid
      from jsonb_array_elements(p_variations) as v
      where v->>'id' is not null
    );

  -- Upsert each variation and its images
  for v_var in select value from jsonb_array_elements(p_variations)
  loop
    if v_var->>'id' is null then
      insert into variations (product_id, sku, attribute, sale, regular_price_cents, sale_price_cents, total_sales)
      values (
        p_product_id,
        v_var->>'sku',
        v_var->'attribute',
        (v_var->>'sale')::boolean,
        (v_var->>'regular_price_cents')::int,
        (v_var->>'sale_price_cents')::int,
        0
      )
      returning id into v_var_id;
    else
      v_var_id := (v_var->>'id')::uuid;
      update variations set
        sku                 = v_var->>'sku',
        attribute           = v_var->'attribute',
        sale                = (v_var->>'sale')::boolean,
        regular_price_cents = (v_var->>'regular_price_cents')::int,
        sale_price_cents    = (v_var->>'sale_price_cents')::int
      where id = v_var_id;
    end if;

    -- Variation images: upsert (insert or update sort_order), delete removed
    insert into variation_images (variation_id, src, name, sort_order)
    select v_var_id, img->>'src', img->>'name', (img->>'sort_order')::int
    from jsonb_array_elements(v_var->'images') as img
    on conflict (variation_id, src) do update set sort_order = excluded.sort_order;

    delete from variation_images
    where variation_id = v_var_id
      and src not in (select img->>'src' from jsonb_array_elements(v_var->'images') as img);
  end loop;
end;
$$;
