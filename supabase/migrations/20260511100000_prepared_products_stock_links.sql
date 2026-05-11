set check_function_bodies = off;

create table if not exists public.product_inventory_links (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null unique references public.products(id) on delete cascade,
  inventory_item_id uuid not null references public.inventory_items(id) on delete restrict,
  quantity_per_sale numeric(18, 3) not null default 1 check (quantity_per_sale > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.prepared_stock_deductions (
  id uuid primary key default gen_random_uuid(),
  source_type text not null check (source_type in ('order', 'pos_sale')),
  source_id uuid not null,
  product_id uuid not null references public.products(id) on delete restrict,
  inventory_item_id uuid not null references public.inventory_items(id) on delete restrict,
  quantity numeric(18, 3) not null check (quantity > 0),
  inventory_movement_id uuid references public.inventory_movements(id) on delete set null,
  reversal_movement_id uuid references public.inventory_movements(id) on delete set null,
  reversed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint prepared_stock_deductions_source_unique unique (source_type, source_id, product_id, inventory_item_id)
);

create index if not exists product_inventory_links_inventory_item_idx
on public.product_inventory_links (inventory_item_id);

create index if not exists prepared_stock_deductions_source_idx
on public.prepared_stock_deductions (source_type, source_id, reversed_at);

alter table public.orders
  add column if not exists inventory_discounted_at timestamptz;

alter table public.pos_sales
  add column if not exists inventory_discounted_at timestamptz;

drop trigger if exists set_product_inventory_links_updated_at on public.product_inventory_links;
create trigger set_product_inventory_links_updated_at
before update on public.product_inventory_links
for each row execute function public.set_updated_at();

alter table public.product_inventory_links enable row level security;
alter table public.prepared_stock_deductions enable row level security;

drop policy if exists "Admins can manage product inventory links" on public.product_inventory_links;
create policy "Admins can manage product inventory links"
on public.product_inventory_links
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can read prepared stock deductions" on public.prepared_stock_deductions;
create policy "Admins can read prepared stock deductions"
on public.prepared_stock_deductions
for select
to authenticated
using (public.is_admin());

drop policy if exists "Admins can insert prepared stock deductions" on public.prepared_stock_deductions;
create policy "Admins can insert prepared stock deductions"
on public.prepared_stock_deductions
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "Admins can update prepared stock deductions" on public.prepared_stock_deductions;
create policy "Admins can update prepared stock deductions"
on public.prepared_stock_deductions
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create or replace function public.format_inventory_quantity(p_value numeric)
returns text
language sql
immutable
as $$
  select case
    when p_value is null then '0'
    when trunc(p_value) = p_value then trunc(p_value)::bigint::text
    else trim(trailing '.' from trim(trailing '0' from p_value::text))
  end;
$$;

create or replace function public.prepared_stock_requirements(p_items jsonb)
returns table (
  product_id uuid,
  product_name text,
  inventory_item_id uuid,
  inventory_item_name text,
  requested_quantity numeric
)
language sql
security definer
set search_path = public
as $$
  with raw_items as (
    select
      (item->>'product_id')::uuid as product_id,
      greatest(coalesce((item->>'quantity')::numeric, 1), 1) as quantity
    from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) item
    where nullif(item->>'product_id', '') is not null
  )
  select
    link.product_id,
    product.name,
    link.inventory_item_id,
    inventory_item.name,
    sum(raw_items.quantity * link.quantity_per_sale)::numeric
  from raw_items
  join public.product_inventory_links link on link.product_id = raw_items.product_id
  join public.products product on product.id = link.product_id
  join public.inventory_items inventory_item on inventory_item.id = link.inventory_item_id
  group by link.product_id, product.name, link.inventory_item_id, inventory_item.name
  order by inventory_item.name, product.name;
$$;

create or replace function public.preview_prepared_stock_issue(p_items jsonb)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  requirement record;
  item_row public.inventory_items;
begin
  for requirement in
    select * from public.prepared_stock_requirements(p_items)
  loop
    select * into item_row
    from public.inventory_items
    where id = requirement.inventory_item_id;

    if item_row.id is null or item_row.is_active = false then
      return format('El preparado "%s" no esta disponible en inventario.', requirement.inventory_item_name);
    end if;

    if item_row.current_stock < requirement.requested_quantity then
      return format(
        'Stock insuficiente para "%s". Solo hay %s en stock.',
        requirement.inventory_item_name,
        public.format_inventory_quantity(item_row.current_stock)
      );
    end if;
  end loop;

  return null;
end;
$$;

create or replace function public.consume_prepared_stock(
  p_source_type text,
  p_source_id uuid,
  p_items jsonb,
  p_reference text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  requirement record;
  item_row public.inventory_items;
  movement_id uuid;
  movement_cost numeric(18, 4);
  reference_text text;
begin
  if p_source_type not in ('order', 'pos_sale') then
    raise exception 'Fuente de descuento no soportada.';
  end if;

  if exists (
    select 1
    from public.prepared_stock_deductions
    where source_type = p_source_type
      and source_id = p_source_id
      and reversed_at is null
  ) then
    return;
  end if;

  for requirement in
    select * from public.prepared_stock_requirements(p_items)
  loop
    select * into item_row
    from public.inventory_items
    where id = requirement.inventory_item_id
    for update;

    if item_row.id is null or item_row.is_active = false then
      raise exception 'El preparado "%" no esta disponible en inventario.', requirement.inventory_item_name;
    end if;

    if item_row.current_stock < requirement.requested_quantity then
      raise exception 'Stock insuficiente para "%". Solo hay % en stock.', requirement.inventory_item_name, public.format_inventory_quantity(item_row.current_stock);
    end if;
  end loop;

  reference_text = nullif(trim(coalesce(p_reference, '')), '');
  if reference_text is null then
    reference_text = case
      when p_source_type = 'order' then 'Pedido con preparados'
      else 'Venta rapida con preparados'
    end;
  end if;

  for requirement in
    select * from public.prepared_stock_requirements(p_items)
  loop
    select * into item_row
    from public.inventory_items
    where id = requirement.inventory_item_id
    for update;

    movement_cost = coalesce(item_row.average_cost, item_row.unit_cost, 0);

    update public.inventory_items
    set current_stock = current_stock - requirement.requested_quantity
    where id = item_row.id;

    insert into public.inventory_movements (
      item_id,
      movement_type,
      quantity,
      unit_id,
      unit_cost,
      total_cost,
      reason,
      notes,
      created_by
    )
    values (
      item_row.id,
      'out',
      requirement.requested_quantity,
      item_row.unit_id,
      movement_cost,
      requirement.requested_quantity * movement_cost,
      reference_text,
      format('Salida automatica por %s %s.', p_source_type, p_source_id),
      auth.uid()
    )
    returning id into movement_id;

    insert into public.prepared_stock_deductions (
      source_type,
      source_id,
      product_id,
      inventory_item_id,
      quantity,
      inventory_movement_id
    )
    values (
      p_source_type,
      p_source_id,
      requirement.product_id,
      item_row.id,
      requirement.requested_quantity,
      movement_id
    );
  end loop;

  if p_source_type = 'order' then
    update public.orders
    set inventory_discounted_at = coalesce(inventory_discounted_at, now())
    where id = p_source_id;
  elsif p_source_type = 'pos_sale' then
    update public.pos_sales
    set inventory_discounted_at = coalesce(inventory_discounted_at, now())
    where id = p_source_id;
  end if;
end;
$$;

create or replace function public.restore_prepared_stock(
  p_source_type text,
  p_source_id uuid,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  deduction_row record;
  item_row public.inventory_items;
  reverse_movement_id uuid;
  movement_cost numeric(18, 4);
  reason_text text;
begin
  if p_source_type not in ('order', 'pos_sale') then
    raise exception 'Fuente de reposicion no soportada.';
  end if;

  reason_text = nullif(trim(coalesce(p_reason, '')), '');
  if reason_text is null then
    reason_text = case
      when p_source_type = 'order' then 'Reposicion por pedido cancelado'
      else 'Reposicion por venta anulada'
    end;
  end if;

  for deduction_row in
    select *
    from public.prepared_stock_deductions
    where source_type = p_source_type
      and source_id = p_source_id
      and reversed_at is null
    order by created_at, id
    for update
  loop
    select * into item_row
    from public.inventory_items
    where id = deduction_row.inventory_item_id
    for update;

    if item_row.id is null then
      continue;
    end if;

    movement_cost = coalesce(item_row.average_cost, item_row.unit_cost, 0);

    update public.inventory_items
    set current_stock = current_stock + deduction_row.quantity
    where id = item_row.id;

    insert into public.inventory_movements (
      item_id,
      movement_type,
      quantity,
      unit_id,
      unit_cost,
      total_cost,
      reason,
      notes,
      created_by
    )
    values (
      item_row.id,
      'return',
      deduction_row.quantity,
      item_row.unit_id,
      movement_cost,
      deduction_row.quantity * movement_cost,
      reason_text,
      format('Reposicion automatica por %s %s.', p_source_type, p_source_id),
      auth.uid()
    )
    returning id into reverse_movement_id;

    update public.prepared_stock_deductions
    set reversed_at = now(),
        reversal_movement_id = reverse_movement_id
    where id = deduction_row.id;
  end loop;

  if p_source_type = 'order' then
    update public.orders
    set inventory_discounted_at = null
    where id = p_source_id;
  elsif p_source_type = 'pos_sale' then
    update public.pos_sales
    set inventory_discounted_at = null
    where id = p_source_id;
  end if;
end;
$$;

create or replace function public.build_order_stock_payload(p_order_id uuid)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'product_id', order_item.product_id,
        'quantity', order_item.quantity
      )
    ),
    '[]'::jsonb
  )
  from public.order_items order_item
  where order_item.order_id = p_order_id
    and order_item.product_id is not null;
$$;

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

  update public.orders
  set subtotal = order_total,
      total = order_total
  where id = inserted_order.id
  returning * into inserted_order;

  perform public.consume_prepared_stock(
    'order',
    inserted_order.id,
    p_items,
    'Pedido ' || inserted_order.order_code
  );

  if normalized_payment_method = 'qr' and nullif(trim(coalesce(p_payment_receipt_path, '')), '') is not null then
    insert into public.payment_receipts (order_id, image_path)
    values (inserted_order.id, trim(p_payment_receipt_path));
  end if;

  return query
  select inserted_order.id, inserted_order.order_code, inserted_order.total, inserted_order.order_status, inserted_order.payment_status;
end;
$$;

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
declare
  order_row public.orders;
  stock_payload jsonb;
begin
  if not public.is_admin() then
    raise exception 'No autorizado';
  end if;

  select * into order_row
  from public.orders
  where id = p_order_id
  for update;

  if order_row.id is null then
    raise exception 'Pedido no encontrado.';
  end if;

  if p_order_status in ('rejected', 'cancelled') and order_row.inventory_discounted_at is not null then
    perform public.restore_prepared_stock(
      'order',
      order_row.id,
      coalesce(nullif(trim(coalesce(p_rejection_reason, '')), ''), 'Reposicion por cambio de estado del pedido')
    );
  elsif p_order_status not in ('rejected', 'cancelled')
    and order_row.inventory_discounted_at is null then
    stock_payload = public.build_order_stock_payload(order_row.id);
    perform public.consume_prepared_stock(
      'order',
      order_row.id,
      stock_payload,
      'Reactivacion pedido ' || order_row.order_code
    );
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

create or replace function public.create_pos_sale(
  p_customer_name text,
  p_customer_phone text,
  p_discount_amount numeric,
  p_payment_method text,
  p_receipt_image_path text,
  p_notes text,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  session_row public.cash_sessions;
  sale_row public.pos_sales;
  item jsonb;
  option_payload jsonb;
  product_row public.products;
  variant_row public.product_variants;
  option_row public.product_options;
  group_row public.product_option_groups;
  sale_item_row public.pos_sale_items;
  item_quantity integer;
  unit_price numeric;
  options_total numeric;
  item_total numeric;
  subtotal_value numeric := 0;
  discount_value numeric := greatest(coalesce(p_discount_amount, 0), 0);
  total_value numeric;
begin
  session_row = public.require_open_cash_session();

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'La venta no tiene productos.';
  end if;

  insert into public.pos_sales (
    cash_session_id,
    customer_name,
    customer_phone,
    subtotal,
    discount_amount,
    total,
    payment_method,
    payment_status,
    receipt_image_path,
    receipt_expires_at,
    notes,
    status,
    created_by,
    created_by_email
  )
  values (
    session_row.id,
    nullif(trim(coalesce(p_customer_name, '')), ''),
    nullif(trim(coalesce(p_customer_phone, '')), ''),
    0,
    0,
    0,
    p_payment_method,
    'confirmed',
    nullif(trim(coalesce(p_receipt_image_path, '')), ''),
    case when p_payment_method = 'qr' and nullif(trim(coalesce(p_receipt_image_path, '')), '') is not null then now() + interval '7 days' else null end,
    nullif(trim(coalesce(p_notes, '')), ''),
    'completed',
    auth.uid(),
    public.cash_actor_email()
  )
  returning * into sale_row;

  for item in select * from jsonb_array_elements(p_items)
  loop
    item_quantity = greatest(coalesce((item->>'quantity')::integer, 1), 1);

    select product.* into product_row
    from public.products product
    join public.product_categories category on category.id = product.category_id
    where product.id = (item->>'product_id')::uuid
      and product.is_active = true
      and category.is_active = true
    limit 1;

    if product_row.id is null then
      raise exception 'Uno de los productos no esta disponible.';
    end if;

    variant_row := null;
    if nullif(item->>'variant_id', '') is not null then
      select * into variant_row
      from public.product_variants
      where id = (item->>'variant_id')::uuid
        and product_id = product_row.id
        and is_active = true
      limit 1;

      if variant_row.id is null then
        raise exception 'Una variante no esta disponible.';
      end if;
      unit_price = variant_row.price;
    else
      unit_price = product_row.base_price;
    end if;

    options_total = 0;
    insert into public.pos_sale_items (
      pos_sale_id,
      product_id,
      product_name_snapshot,
      variant_id,
      variant_name_snapshot,
      quantity,
      unit_price,
      total_price,
      notes
    )
    values (
      sale_row.id,
      product_row.id,
      product_row.name,
      variant_row.id,
      variant_row.name,
      item_quantity,
      unit_price,
      0,
      nullif(trim(coalesce(item->>'notes', '')), '')
    )
    returning * into sale_item_row;

    if jsonb_typeof(item->'options') = 'array' then
      for option_payload in select * from jsonb_array_elements(item->'options')
      loop
        select option_item.* into option_row
        from public.product_options option_item
        where option_item.id = (option_payload->>'option_id')::uuid
          and option_item.is_active = true
        limit 1;

        select option_group.* into group_row
        from public.product_option_groups option_group
        where option_group.id = option_row.option_group_id
          and option_group.product_id = product_row.id
          and option_group.is_active = true
        limit 1;

        if option_row.id is null or group_row.id is null then
          raise exception 'Una opcion seleccionada no corresponde al producto.';
        end if;

        options_total = options_total + option_row.extra_price;
        insert into public.pos_sale_item_options (
          pos_sale_item_id,
          option_group_name_snapshot,
          option_name_snapshot,
          extra_price
        )
        values (sale_item_row.id, group_row.name, option_row.name, option_row.extra_price);
      end loop;
    end if;

    item_total = (unit_price + options_total) * item_quantity;
    subtotal_value = subtotal_value + item_total;

    update public.pos_sale_items
    set total_price = item_total
    where id = sale_item_row.id;
  end loop;

  total_value = greatest(round(subtotal_value - discount_value, 2), 0);
  update public.pos_sales
  set subtotal = round(subtotal_value, 2),
      discount_amount = least(discount_value, round(subtotal_value, 2)),
      total = total_value
  where id = sale_row.id
  returning * into sale_row;

  perform public.consume_prepared_stock(
    'pos_sale',
    sale_row.id,
    p_items,
    'Venta directa ' || sale_row.sale_number
  );

  insert into public.payments (
    cash_session_id,
    source_type,
    source_id,
    customer_name,
    customer_phone,
    amount,
    payment_method,
    payment_status,
    receipt_image_path,
    receipt_expires_at,
    confirmed_by,
    confirmed_at,
    notes
  )
  values (
    session_row.id,
    'pos_sale',
    sale_row.id,
    sale_row.customer_name,
    sale_row.customer_phone,
    sale_row.total,
    sale_row.payment_method,
    'confirmed',
    sale_row.receipt_image_path,
    sale_row.receipt_expires_at,
    auth.uid(),
    now(),
    sale_row.notes
  );

  perform public.insert_cash_movement(session_row.id, 'pos_sale', 'pos_sale', sale_row.id, 'Venta directa ' || sale_row.sale_number, sale_row.total, sale_row.payment_method, 'in');
  perform public.log_cash_action('CREATE_POS_SALE', 'pos_sale', sale_row.id, null, to_jsonb(sale_row), null, null);
  return sale_row.id;
end;
$$;

create or replace function public.cancel_cash_movement(
  p_movement_id uuid,
  p_reason text,
  p_authorization_key text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  movement_row public.cash_movements;
begin
  perform public.require_cash_admin();

  if not public.verify_cash_authorization_key(p_authorization_key) then
    raise exception 'Clave de autorizacion incorrecta.';
  end if;

  if nullif(trim(coalesce(p_reason, '')), '') is null then
    raise exception 'El motivo de anulacion es obligatorio.';
  end if;

  select * into movement_row
  from public.cash_movements
  where id = p_movement_id
  for update;

  if movement_row.id is null then
    raise exception 'Movimiento no encontrado.';
  end if;

  if movement_row.status = 'cancelled' then
    raise exception 'El movimiento ya fue anulado.';
  end if;

  update public.cash_movements
  set status = 'cancelled',
      cancelled_at = now(),
      cancelled_by = auth.uid(),
      cancellation_reason = trim(p_reason)
  where id = movement_row.id;

  update public.payments
  set payment_status = 'cancelled',
      is_deleted = true,
      deleted_at = now(),
      deleted_by = auth.uid(),
      delete_reason = trim(p_reason)
  where source_type = movement_row.source_type
    and source_id = movement_row.source_id
    and payment_status <> 'cancelled';

  if movement_row.source_type = 'pos_sale' then
    perform public.restore_prepared_stock('pos_sale', movement_row.source_id, trim(p_reason));

    update public.pos_sales
    set status = 'cancelled',
        payment_status = 'cancelled',
        is_deleted = true,
        deleted_at = now(),
        deleted_by = auth.uid(),
        delete_reason = trim(p_reason)
    where id = movement_row.source_id;
  elsif movement_row.source_type = 'cash_expense' then
    update public.cash_expenses
    set is_deleted = true,
        deleted_at = now(),
        deleted_by = auth.uid(),
        delete_reason = trim(p_reason)
    where id = movement_row.source_id;
  elsif movement_row.source_type = 'reservation' then
    update public.bookings
    set payment_status = 'cancelled',
        payment_method = null,
        paid_at = null,
        cash_session_id = null,
        status = 'confirmed'::public.booking_status
    where id = movement_row.source_id;
  elsif movement_row.source_type = 'table_order' then
    update public.orders
    set payment_status = case when payment_method = 'cash' then 'cash_pending' else 'pending' end
    where id = movement_row.source_id;
  end if;

  perform public.log_cash_action('CANCEL_CASH_MOVEMENT', 'cash_movement', movement_row.id, to_jsonb(movement_row), jsonb_build_object('status', 'cancelled'), trim(p_reason), null);
end;
$$;

grant execute on function public.prepared_stock_requirements(jsonb) to authenticated, anon;
grant execute on function public.preview_prepared_stock_issue(jsonb) to authenticated, anon;
grant execute on function public.consume_prepared_stock(text, uuid, jsonb, text) to authenticated, anon;
grant execute on function public.restore_prepared_stock(text, uuid, text) to authenticated;
grant execute on function public.build_order_stock_payload(uuid) to authenticated;
