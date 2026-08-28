# Deploying 006_save_product.sql to Production

## 1. Verify no constraint violations exist

Run in Supabase SQL editor before applying anything:

```sql
select product_id, src, count(*)
from product_images
group by product_id, src
having count(*) > 1;

select variation_id, src, count(*)
from variation_images
group by variation_id, src
having count(*) > 1;
```

Both queries must return no rows. If either returns rows, stop — duplicate data exists and the constraint will fail to apply.

## 2. Apply the migration

Once both queries are clean, run `006_save_product.sql` in the Supabase SQL editor. It:
- Adds `unique (product_id, src)` to `product_images`
- Adds `unique (variation_id, src)` to `variation_images`
- Creates the `save_product` RPC function

## 3. Deploy the code

Push/deploy the updated backend. The `saveProduct` server action now calls `supabase.rpc("save_product", ...)` — it will fail until the function exists in the DB, so run step 2 before deploying.
