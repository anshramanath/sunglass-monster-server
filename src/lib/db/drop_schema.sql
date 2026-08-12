-- ============================================================
-- drop_schema.sql
-- Wipes all tables for a clean re-apply of initial_schema.sql
-- Development only — never run in production
-- ============================================================

drop table if exists prescription_frames cascade;
drop table if exists tbyb_submissions cascade;
drop table if exists tbyb_packages cascade;
drop table if exists order_items cascade;
drop table if exists orders cascade;
drop table if exists bookmarks cascade;
drop table if exists cart_items cascade;
drop table if exists admins cascade;
drop table if exists product_description_images cascade;
drop table if exists description_images cascade;
drop table if exists variation_images cascade;
drop table if exists product_images cascade;
drop table if exists variations cascade;
drop table if exists product_categories cascade;
drop table if exists products cascade;
drop table if exists categories cascade;
drop table if exists brands cascade;
drop function if exists update_total_sales();
drop function if exists decrement_total_sales_on_refund();
drop function if exists increment_category_view(uuid, text);
drop function if exists increment_product_view(text, text);
