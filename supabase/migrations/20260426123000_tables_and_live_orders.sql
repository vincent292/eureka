create table if not exists public.restaurant_tables (
  id uuid primary key default gen_random_uuid(),
  table_number integer not null,
  table_name text,
  table_code text not null unique,
  qr_url text,
  qr_image_path text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint restaurant_tables_table_number_positive check (table_number > 0)
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_code text not null unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  table_id uuid not null references public.restaurant_tables(id) on delete restrict,
  customer_name text not null,
  customer_phone text not null,
  payment_method text not null check (payment_method in ('qr', 'cash')),
  payment_status text not null default 'pending' check (payment_status in ('pending', 'paid', 'rejected', 'cash_pending')),
  order_status text not null default 'new' check (order_status in ('new', 'pending_review', 'accepted', 'preparing', 'ready', 'delivered', 'rejected', 'cancelled')),
  subtotal numeric(10, 2) not null default 0 check (subtotal >= 0),
  total numeric(10, 2) not null default 0 check (total >= 0),
  rejection_reason text,
  accepted_at timestamptz,
  rejected_at timestamptz,
  prepared_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name_snapshot text not null,
  variant_id uuid references public.product_variants(id) on delete set null,
  variant_name_snapshot text,
  quantity integer not null check (quantity > 0),
  unit_price numeric(10, 2) not null check (unit_price >= 0),
  notes text,
  total_price numeric(10, 2) not null check (total_price >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.order_item_options (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null references public.order_items(id) on delete cascade,
  option_group_name_snapshot text not null,
  option_name_snapshot text not null,
  extra_price numeric(10, 2) not null default 0 check (extra_price >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.payment_receipts (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade,
  image_path text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '2 days',
  is_deleted boolean not null default false
);

create unique index if not exists restaurant_tables_number_idx
on public.restaurant_tables (table_number);

create index if not exists orders_table_id_idx
on public.orders (table_id);

create index if not exists orders_created_at_idx
on public.orders (created_at desc);

create index if not exists orders_order_status_idx
on public.orders (order_status);

create index if not exists orders_payment_status_idx
on public.orders (payment_status);

create index if not exists order_items_order_id_idx
on public.order_items (order_id);

create index if not exists order_item_options_item_id_idx
on public.order_item_options (order_item_id);

create index if not exists payment_receipts_order_id_idx
on public.payment_receipts (order_id);

drop trigger if exists set_restaurant_tables_updated_at on public.restaurant_tables;
create trigger set_restaurant_tables_updated_at
before update on public.restaurant_tables
for each row execute function public.set_updated_at();

drop trigger if exists set_orders_updated_at on public.orders;
create trigger set_orders_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

alter table public.restaurant_tables enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_item_options enable row level security;
alter table public.payment_receipts enable row level security;

drop policy if exists "Public can read active restaurant tables" on public.restaurant_tables;
create policy "Public can read active restaurant tables"
on public.restaurant_tables
for select
to anon, authenticated
using (is_active = true);

drop policy if exists "Admins can manage restaurant tables" on public.restaurant_tables;
create policy "Admins can manage restaurant tables"
on public.restaurant_tables
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can manage orders" on public.orders;
create policy "Admins can manage orders"
on public.orders
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can manage order items" on public.order_items;
create policy "Admins can manage order items"
on public.order_items
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can manage order item options" on public.order_item_options;
create policy "Admins can manage order item options"
on public.order_item_options
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can manage order receipts" on public.payment_receipts;
create policy "Admins can manage order receipts"
on public.payment_receipts
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', true)
on conflict (id) do nothing;

drop policy if exists "Public can upload order receipts" on storage.objects;
create policy "Public can upload order receipts"
on storage.objects
for insert
to anon, authenticated
with check (
  bucket_id = 'receipts'
  and name like 'uploads/receipts/%'
);

drop policy if exists "Public can read order receipt uploads" on storage.objects;
create policy "Public can read order receipt uploads"
on storage.objects
for select
to anon, authenticated
using (
  bucket_id = 'receipts'
  and name like 'uploads/receipts/%'
);

drop policy if exists "Admins can manage order receipt uploads" on storage.objects;
create policy "Admins can manage order receipt uploads"
on storage.objects
for all
to authenticated
using (bucket_id = 'receipts' and public.is_admin())
with check (bucket_id = 'receipts' and public.is_admin());

create or replace function public.create_table_order(
  p_table_code text,
  p_customer_name text,
  p_customer_phone text,
  p_payment_method text,
  p_payment_receipt_path text,
  p_items jsonb
)
returns table (
  order_id uuid,
  order_code text,
  total numeric,
  order_status text,
  payment_status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_table public.restaurant_tables;
  inserted_order public.orders;
  item jsonb;
  option_payload jsonb;
  selected_product public.products;
  selected_variant public.product_variants;
  selected_option public.product_options;
  selected_group public.product_option_groups;
  inserted_item public.order_items;
  required_group record;
  selected_count integer;
  item_quantity integer;
  item_unit_price numeric;
  item_options_total numeric;
  item_total numeric;
  order_total numeric := 0;
  normalized_payment_method text;
  next_payment_status text;
  next_order_status text;
begin
  select *
  into selected_table
  from public.restaurant_tables
  where table_code = p_table_code
    and is_active = true
  limit 1;

  if selected_table.id is null then
    raise exception 'Esta mesa no esta disponible.';
  end if;

  normalized_payment_method = lower(trim(coalesce(p_payment_method, '')));
  if normalized_payment_method not in ('qr', 'cash') then
    raise exception 'Metodo de pago invalido.';
  end if;

  if nullif(trim(coalesce(p_customer_name, '')), '') is null then
    raise exception 'Ingresa tu nombre completo.';
  end if;

  if length(regexp_replace(coalesce(p_customer_phone, ''), '\D', '', 'g')) < 7 then
    raise exception 'Ingresa un telefono WhatsApp valido.';
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'El pedido no tiene productos.';
  end if;

  if normalized_payment_method = 'qr' then
    if nullif(trim(coalesce(p_payment_receipt_path, '')), '') is null then
      raise exception 'Sube el comprobante de pago.';
    end if;

    if not exists (
      select 1
      from public.payment_qrs
      where is_active = true
        and (expires_at is null or expires_at > now())
      limit 1
    ) then
      raise exception 'No hay QR de pago disponible actualmente.';
    end if;
  end if;

  next_payment_status = case normalized_payment_method
    when 'cash' then 'cash_pending'
    else 'pending'
  end;
  next_order_status = case normalized_payment_method
    when 'cash' then 'new'
    else 'pending_review'
  end;

  insert into public.orders (
    table_id,
    customer_name,
    customer_phone,
    payment_method,
    payment_status,
    order_status,
    subtotal,
    total
  )
  values (
    selected_table.id,
    trim(p_customer_name),
    regexp_replace(coalesce(p_customer_phone, ''), '\D', '', 'g'),
    normalized_payment_method,
    next_payment_status,
    next_order_status,
    0,
    0
  )
  returning * into inserted_order;

  for item in select * from jsonb_array_elements(p_items)
  loop
    item_quantity = greatest(coalesce((item->>'quantity')::integer, 1), 1);
    selected_product := null;

    select product.*
    into selected_product
    from public.products product
    join public.product_categories category on category.id = product.category_id
    where product.id = (item->>'product_id')::uuid
      and product.is_active = true
      and category.is_active = true
    limit 1;

    if selected_product.id is null then
      raise exception 'Uno de los productos no esta disponible.';
    end if;

    selected_variant := null;
    if nullif(item->>'variant_id', '') is not null then
      select *
      into selected_variant
      from public.product_variants
      where id = (item->>'variant_id')::uuid
        and product_id = selected_product.id
        and is_active = true
      limit 1;

      if selected_variant.id is null then
        raise exception 'Una variante seleccionada no esta disponible.';
      end if;

      item_unit_price = selected_variant.price;
    else
      item_unit_price = selected_product.base_price;
    end if;

    item_options_total = 0;

    insert into public.order_items (
      order_id,
      product_id,
      product_name_snapshot,
      variant_id,
      variant_name_snapshot,
      quantity,
      unit_price,
      notes,
      total_price
    )
    values (
      inserted_order.id,
      selected_product.id,
      selected_product.name,
      selected_variant.id,
      selected_variant.name,
      item_quantity,
      item_unit_price,
      nullif(trim(coalesce(item->>'notes', '')), ''),
      0
    )
    returning * into inserted_item;

    if jsonb_typeof(item->'options') = 'array' then
      for option_payload in select * from jsonb_array_elements(item->'options')
      loop
        selected_option := null;
        selected_group := null;

        select option_item.*
        into selected_option
        from public.product_options option_item
        where option_item.id = (option_payload->>'option_id')::uuid
          and option_item.is_active = true
        limit 1;

        if selected_option.id is null then
          raise exception 'Una opcion seleccionada no esta disponible.';
        end if;

        select option_group.*
        into selected_group
        from public.product_option_groups option_group
        where option_group.id = selected_option.option_group_id
          and option_group.is_active = true
          and option_group.product_id = selected_product.id
        limit 1;

        if selected_group.id is null then
          raise exception 'Una opcion seleccionada no corresponde al producto.';
        end if;

        item_options_total = item_options_total + selected_option.extra_price;

        insert into public.order_item_options (
          order_item_id,
          option_group_name_snapshot,
          option_name_snapshot,
          extra_price
        )
        values (
          inserted_item.id,
          selected_group.name,
          selected_option.name,
          selected_option.extra_price
        );
      end loop;
    end if;

    for required_group in
      select *
      from public.product_option_groups
      where product_id = selected_product.id
        and is_active = true
    loop
      selected_count = 0;

      if jsonb_typeof(item->'options') = 'array' then
        select count(*)
        into selected_count
        from jsonb_array_elements(item->'options') option_payload
        join public.product_options option_item
          on option_item.id = (option_payload->>'option_id')::uuid
        where option_item.option_group_id = required_group.id
          and option_item.is_active = true;
      end if;

      if required_group.is_required and selected_count < greatest(required_group.min_select, 1) then
        raise exception 'Completa la opcion requerida: %', required_group.name;
      end if;

      if selected_count < required_group.min_select then
        raise exception 'Selecciona al menos % opcion(es) en %', required_group.min_select, required_group.name;
      end if;

      if required_group.max_select > 0 and selected_count > required_group.max_select then
        raise exception 'Selecciona maximo % opcion(es) en %', required_group.max_select, required_group.name;
      end if;

      if required_group.selection_type = 'single' and selected_count > 1 then
        raise exception 'Solo puedes elegir una opcion en %', required_group.name;
      end if;
    end loop;

    item_total = (item_unit_price + item_options_total) * item_quantity;
    order_total = order_total + item_total;

    update public.order_items
    set total_price = item_total
    where id = inserted_item.id;
  end loop;

  if normalized_payment_method = 'qr' and nullif(trim(coalesce(p_payment_receipt_path, '')), '') is not null then
    insert into public.payment_receipts (order_id, image_path)
    values (inserted_order.id, trim(p_payment_receipt_path));
  end if;

  update public.orders
  set subtotal = order_total,
      total = order_total
  where id = inserted_order.id
  returning * into inserted_order;

  return query
  select inserted_order.id, inserted_order.order_code, inserted_order.total, inserted_order.order_status, inserted_order.payment_status;
end;
$$;

grant execute on function public.create_table_order(text, text, text, text, text, jsonb) to anon, authenticated;

create or replace function public.update_order_status(
  p_order_id uuid,
  p_order_status text,
  p_payment_status text default null,
  p_rejection_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'No autorizado';
  end if;

  update public.orders
  set order_status = p_order_status,
      payment_status = coalesce(p_payment_status, payment_status),
      rejection_reason = case when p_order_status = 'rejected' then nullif(trim(coalesce(p_rejection_reason, '')), '') else rejection_reason end,
      accepted_at = case when p_order_status in ('accepted', 'preparing') and accepted_at is null then now() else accepted_at end,
      prepared_at = case when p_order_status = 'ready' then now() else prepared_at end,
      delivered_at = case when p_order_status = 'delivered' then now() else delivered_at end,
      rejected_at = case when p_order_status = 'rejected' then now() else rejected_at end
  where id = p_order_id;
end;
$$;

grant execute on function public.update_order_status(uuid, text, text, text) to authenticated;

create or replace function public.cleanup_old_order_receipts()
returns integer
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  deleted_count integer := 0;
begin
  with old_receipts as (
    select id, image_path
    from public.payment_receipts
    where is_deleted = false
      and expires_at < now()
      and image_path like 'uploads/receipts/%'
  ),
  deleted_objects as (
    delete from storage.objects object
    using old_receipts receipt
    where object.bucket_id = 'receipts'
      and object.name = receipt.image_path
    returning object.name
  ),
  updated_receipts as (
    update public.payment_receipts receipt
    set is_deleted = true
    from old_receipts old_receipt
    where receipt.id = old_receipt.id
    returning receipt.id
  )
  select count(*) into deleted_count from updated_receipts;

  return deleted_count;
end;
$$;

grant execute on function public.cleanup_old_order_receipts() to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.orders;
exception
  when duplicate_object then null;
  when undefined_object then null;
  when others then null;
end $$;
