drop policy if exists "Admins can manage payment qrs" on public.payment_qrs;
create policy "Admins can read payment qrs"
on public.payment_qrs for select to authenticated
using (public.is_admin());
create policy "Admins can insert payment qrs"
on public.payment_qrs for insert to authenticated
with check (public.is_admin());
create policy "Admins can update payment qrs"
on public.payment_qrs for update to authenticated
using (public.is_admin())
with check (public.is_admin());
create policy "Super admins can delete payment qrs"
on public.payment_qrs for delete to authenticated
using (public.is_super_admin());

drop policy if exists "Admins can manage bookings" on public.bookings;
create policy "Admins can read bookings"
on public.bookings for select to authenticated
using (public.is_admin());
create policy "Admins can insert bookings"
on public.bookings for insert to authenticated
with check (public.is_admin());
create policy "Admins can update bookings"
on public.bookings for update to authenticated
using (public.is_admin())
with check (public.is_admin());
create policy "Super admins can delete bookings"
on public.bookings for delete to authenticated
using (public.is_super_admin());

drop policy if exists "Admins can manage duration prices" on public.booking_duration_prices;
create policy "Admins can read duration prices"
on public.booking_duration_prices for select to authenticated
using (public.is_admin());
create policy "Admins can insert duration prices"
on public.booking_duration_prices for insert to authenticated
with check (public.is_admin());
create policy "Admins can update duration prices"
on public.booking_duration_prices for update to authenticated
using (public.is_admin())
with check (public.is_admin());
create policy "Super admins can delete duration prices"
on public.booking_duration_prices for delete to authenticated
using (public.is_super_admin());

drop policy if exists "Admins can manage discount tokens" on public.discount_tokens;
create policy "Admins can read discount tokens"
on public.discount_tokens for select to authenticated
using (public.is_admin());
create policy "Admins can insert discount tokens"
on public.discount_tokens for insert to authenticated
with check (public.is_admin());
create policy "Admins can update discount tokens"
on public.discount_tokens for update to authenticated
using (public.is_admin())
with check (public.is_admin());
create policy "Super admins can delete discount tokens"
on public.discount_tokens for delete to authenticated
using (public.is_super_admin());

drop policy if exists "Admins can manage product categories" on public.product_categories;
create policy "Admins can read product categories"
on public.product_categories for select to authenticated
using (public.is_admin());
create policy "Admins can insert product categories"
on public.product_categories for insert to authenticated
with check (public.is_admin());
create policy "Admins can update product categories"
on public.product_categories for update to authenticated
using (public.is_admin())
with check (public.is_admin());
create policy "Super admins can delete product categories"
on public.product_categories for delete to authenticated
using (public.is_super_admin());

drop policy if exists "Admins can manage products" on public.products;
create policy "Admins can read products"
on public.products for select to authenticated
using (public.is_admin());
create policy "Admins can insert products"
on public.products for insert to authenticated
with check (public.is_admin());
create policy "Admins can update products"
on public.products for update to authenticated
using (public.is_admin())
with check (public.is_admin());
create policy "Super admins can delete products"
on public.products for delete to authenticated
using (public.is_super_admin());

drop policy if exists "Admins can manage product variants" on public.product_variants;
create policy "Admins can read product variants"
on public.product_variants for select to authenticated
using (public.is_admin());
create policy "Admins can insert product variants"
on public.product_variants for insert to authenticated
with check (public.is_admin());
create policy "Admins can update product variants"
on public.product_variants for update to authenticated
using (public.is_admin())
with check (public.is_admin());
create policy "Super admins can delete product variants"
on public.product_variants for delete to authenticated
using (public.is_super_admin());

drop policy if exists "Admins can manage product option groups" on public.product_option_groups;
create policy "Admins can read product option groups"
on public.product_option_groups for select to authenticated
using (public.is_admin());
create policy "Admins can insert product option groups"
on public.product_option_groups for insert to authenticated
with check (public.is_admin());
create policy "Admins can update product option groups"
on public.product_option_groups for update to authenticated
using (public.is_admin())
with check (public.is_admin());
create policy "Super admins can delete product option groups"
on public.product_option_groups for delete to authenticated
using (public.is_super_admin());

drop policy if exists "Admins can manage product options" on public.product_options;
create policy "Admins can read product options"
on public.product_options for select to authenticated
using (public.is_admin());
create policy "Admins can insert product options"
on public.product_options for insert to authenticated
with check (public.is_admin());
create policy "Admins can update product options"
on public.product_options for update to authenticated
using (public.is_admin())
with check (public.is_admin());
create policy "Super admins can delete product options"
on public.product_options for delete to authenticated
using (public.is_super_admin());

drop policy if exists "Admins can manage restaurant tables" on public.restaurant_tables;
create policy "Admins can read restaurant tables"
on public.restaurant_tables for select to authenticated
using (public.is_admin());
create policy "Admins can insert restaurant tables"
on public.restaurant_tables for insert to authenticated
with check (public.is_admin());
create policy "Admins can update restaurant tables"
on public.restaurant_tables for update to authenticated
using (public.is_admin())
with check (public.is_admin());
create policy "Super admins can delete restaurant tables"
on public.restaurant_tables for delete to authenticated
using (public.is_super_admin());

drop policy if exists "Admins can manage orders" on public.orders;
create policy "Admins can read orders"
on public.orders for select to authenticated
using (public.is_admin());
create policy "Admins can insert orders"
on public.orders for insert to authenticated
with check (public.is_admin());
create policy "Admins can update orders"
on public.orders for update to authenticated
using (public.is_admin())
with check (public.is_admin());
create policy "Super admins can delete orders"
on public.orders for delete to authenticated
using (public.is_super_admin());

drop policy if exists "Admins can manage order items" on public.order_items;
create policy "Admins can read order items"
on public.order_items for select to authenticated
using (public.is_admin());
create policy "Admins can insert order items"
on public.order_items for insert to authenticated
with check (public.is_admin());
create policy "Admins can update order items"
on public.order_items for update to authenticated
using (public.is_admin())
with check (public.is_admin());
create policy "Super admins can delete order items"
on public.order_items for delete to authenticated
using (public.is_super_admin());

drop policy if exists "Admins can manage order item options" on public.order_item_options;
create policy "Admins can read order item options"
on public.order_item_options for select to authenticated
using (public.is_admin());
create policy "Admins can insert order item options"
on public.order_item_options for insert to authenticated
with check (public.is_admin());
create policy "Admins can update order item options"
on public.order_item_options for update to authenticated
using (public.is_admin())
with check (public.is_admin());
create policy "Super admins can delete order item options"
on public.order_item_options for delete to authenticated
using (public.is_super_admin());

drop policy if exists "Admins can manage order receipts" on public.payment_receipts;
create policy "Admins can read order receipts"
on public.payment_receipts for select to authenticated
using (public.is_admin());
create policy "Admins can insert order receipts"
on public.payment_receipts for insert to authenticated
with check (public.is_admin());
create policy "Admins can update order receipts"
on public.payment_receipts for update to authenticated
using (public.is_admin())
with check (public.is_admin());
create policy "Super admins can delete order receipts"
on public.payment_receipts for delete to authenticated
using (public.is_super_admin());
