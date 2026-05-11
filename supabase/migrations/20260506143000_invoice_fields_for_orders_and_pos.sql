alter table public.orders
  add column if not exists invoice_required boolean not null default false,
  add column if not exists invoice_document text,
  add column if not exists invoice_name text;

alter table public.pos_sales
  add column if not exists invoice_required boolean not null default false,
  add column if not exists invoice_document text,
  add column if not exists invoice_name text;

alter table public.payments
  add column if not exists invoice_required boolean not null default false,
  add column if not exists invoice_document text,
  add column if not exists invoice_name text;

drop function if exists public.create_table_order(text, text, text, text, text, jsonb);

create or replace function public.create_table_order(
  p_table_code text,
  p_customer_name text,
  p_customer_phone text,
  p_payment_method text,
  p_payment_receipt_path text,
  p_items jsonb,
  p_invoice_required boolean default false,
  p_invoice_document text default null,
  p_invoice_name text default null
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
  item_payload jsonb;
  selected_option_payload jsonb;
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
  normalized_invoice_required boolean := coalesce(p_invoice_required, false);
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

  if normalized_invoice_required and (
    nullif(trim(coalesce(p_invoice_document, '')), '') is null
    or nullif(trim(coalesce(p_invoice_name, '')), '') is null
  ) then
    raise exception 'Completa NIT/CI y nombre para la factura.';
  end if;

  if coalesce(jsonb_typeof(p_items), '') <> 'array' or jsonb_array_length(p_items) = 0 then
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

  insert into public.orders (
    table_id,
    customer_name,
    customer_phone,
    invoice_required,
    invoice_document,
    invoice_name,
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
    normalized_invoice_required,
    case when normalized_invoice_required then nullif(trim(coalesce(p_invoice_document, '')), '') else null end,
    case when normalized_invoice_required then nullif(trim(coalesce(p_invoice_name, '')), '') else null end,
    normalized_payment_method,
    case normalized_payment_method when 'cash' then 'cash_pending' else 'pending' end,
    case normalized_payment_method when 'cash' then 'new' else 'pending_review' end,
    0,
    0
  )
  returning * into inserted_order;

  for item_payload in
    select incoming_item.value
    from jsonb_array_elements(p_items) as incoming_item(value)
  loop
    item_quantity = greatest(coalesce((item_payload->>'quantity')::integer, 1), 1);
    selected_product := null;

    select product.*
    into selected_product
    from public.products product
    join public.product_categories category on category.id = product.category_id
    where product.id = (item_payload->>'product_id')::uuid
      and product.is_active = true
      and category.is_active = true
    limit 1;

    if selected_product.id is null then
      raise exception 'Uno de los productos no esta disponible.';
    end if;

    selected_variant := null;
    if nullif(item_payload->>'variant_id', '') is not null then
      select *
      into selected_variant
      from public.product_variants
      where id = (item_payload->>'variant_id')::uuid
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
      nullif(trim(coalesce(item_payload->>'notes', '')), ''),
      0
    )
    returning * into inserted_item;

    if jsonb_typeof(item_payload->'options') = 'array' then
      for selected_option_payload in
        select incoming_option.value
        from jsonb_array_elements(item_payload->'options') as incoming_option(value)
      loop
        selected_option := null;
        selected_group := null;

        select option_item.*
        into selected_option
        from public.product_options option_item
        where option_item.id = (selected_option_payload->>'option_id')::uuid
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

      if jsonb_typeof(item_payload->'options') = 'array' then
        select count(*)
        into selected_count
        from jsonb_array_elements(item_payload->'options') as selected_option_json(value)
        join public.product_options option_item
          on option_item.id = (selected_option_json.value->>'option_id')::uuid
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

grant execute on function public.create_table_order(text, text, text, text, text, jsonb, boolean, text, text) to anon, authenticated;

drop function if exists public.create_pos_sale(text, text, numeric, text, text, text, jsonb);

create or replace function public.create_pos_sale(
  p_customer_name text,
  p_customer_phone text,
  p_discount_amount numeric,
  p_payment_method text,
  p_receipt_image_path text,
  p_notes text,
  p_items jsonb,
  p_invoice_required boolean default false,
  p_invoice_document text default null,
  p_invoice_name text default null
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
  normalized_invoice_required boolean := coalesce(p_invoice_required, false);
  movement_label text;
begin
  session_row = public.require_open_cash_session();

  if normalized_invoice_required and (
    nullif(trim(coalesce(p_invoice_document, '')), '') is null
    or nullif(trim(coalesce(p_invoice_name, '')), '') is null
  ) then
    raise exception 'Completa NIT/CI y nombre para la factura.';
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'La venta no tiene productos.';
  end if;

  insert into public.pos_sales (
    cash_session_id,
    customer_name,
    customer_phone,
    invoice_required,
    invoice_document,
    invoice_name,
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
    normalized_invoice_required,
    case when normalized_invoice_required then nullif(trim(coalesce(p_invoice_document, '')), '') else null end,
    case when normalized_invoice_required then nullif(trim(coalesce(p_invoice_name, '')), '') else null end,
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

  insert into public.payments (
    cash_session_id,
    source_type,
    source_id,
    customer_name,
    customer_phone,
    invoice_required,
    invoice_document,
    invoice_name,
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
    sale_row.invoice_required,
    sale_row.invoice_document,
    sale_row.invoice_name,
    sale_row.total,
    sale_row.payment_method,
    'confirmed',
    sale_row.receipt_image_path,
    sale_row.receipt_expires_at,
    auth.uid(),
    now(),
    sale_row.notes
  );

  movement_label = 'Venta directa ' || sale_row.sale_number;
  if sale_row.invoice_required then
    movement_label = movement_label || ' | Factura ' || coalesce(sale_row.invoice_document, 'S/N') || ' - ' || coalesce(sale_row.invoice_name, 'Sin nombre');
  end if;

  perform public.insert_cash_movement(session_row.id, 'pos_sale', 'pos_sale', sale_row.id, movement_label, sale_row.total, sale_row.payment_method, 'in');
  perform public.log_cash_action('CREATE_POS_SALE', 'pos_sale', sale_row.id, null, to_jsonb(sale_row), null, null);
  return sale_row.id;
end;
$$;

grant execute on function public.create_pos_sale(text, text, numeric, text, text, text, jsonb, boolean, text, text) to authenticated;

create or replace function public.register_table_order_payment(
  p_order_id uuid,
  p_payment_method text,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  session_row public.cash_sessions;
  order_row public.orders;
  receipt_path text;
  payment_row public.payments;
  movement_label text;
begin
  session_row = public.require_open_cash_session();

  select * into order_row from public.orders where id = p_order_id for update;
  if order_row.id is null then
    raise exception 'Pedido no encontrado.';
  end if;

  if exists (
    select 1 from public.payments
    where source_type = 'table_order'
      and source_id = p_order_id
      and payment_status in ('pending', 'confirmed')
      and is_deleted = false
  ) then
    raise exception 'Este pedido ya tiene un pago registrado.';
  end if;

  select image_path into receipt_path
  from public.payment_receipts
  where order_id = order_row.id and is_deleted = false
  order by created_at desc
  limit 1;

  if p_payment_method = 'qr' and receipt_path is null then
    raise exception 'El pedido QR necesita comprobante.';
  end if;

  insert into public.payments (
    cash_session_id,
    source_type,
    source_id,
    customer_name,
    customer_phone,
    invoice_required,
    invoice_document,
    invoice_name,
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
    'table_order',
    order_row.id,
    order_row.customer_name,
    order_row.customer_phone,
    order_row.invoice_required,
    order_row.invoice_document,
    order_row.invoice_name,
    order_row.total,
    p_payment_method,
    'confirmed',
    receipt_path,
    case when p_payment_method = 'qr' and receipt_path is not null then now() + interval '7 days' else null end,
    auth.uid(),
    now(),
    nullif(trim(coalesce(p_notes, '')), '')
  )
  returning * into payment_row;

  update public.orders
  set payment_status = 'paid',
      payment_method = case when p_payment_method in ('cash', 'qr') then p_payment_method else payment_method end,
      order_status = case when order_status in ('new', 'pending_review') then 'accepted' else order_status end,
      accepted_at = coalesce(accepted_at, now())
  where id = order_row.id;

  movement_label = 'Pago pedido ' || order_row.order_code;
  if order_row.invoice_required then
    movement_label = movement_label || ' | Factura ' || coalesce(order_row.invoice_document, 'S/N') || ' - ' || coalesce(order_row.invoice_name, 'Sin nombre');
  end if;

  perform public.insert_cash_movement(session_row.id, 'table_order_payment', 'table_order', order_row.id, movement_label, payment_row.amount, payment_row.payment_method, 'in');
  perform public.log_cash_action('REGISTER_TABLE_ORDER_PAYMENT', 'order', order_row.id, to_jsonb(order_row), jsonb_build_object('paymentId', payment_row.id, 'paymentStatus', 'paid'), null, null);
  return payment_row.id;
end;
$$;
