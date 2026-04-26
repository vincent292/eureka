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

grant execute on function public.create_table_order(text, text, text, text, text, jsonb) to anon, authenticated;
