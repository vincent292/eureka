create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.admin_profiles
    where id = auth.uid()
      and is_active = true
      and role in ('admin', 'staff', 'super_admin')
  );
$$;

create or replace function public.is_owner_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.admin_profiles
    where id = auth.uid()
      and is_active = true
      and role in ('admin', 'super_admin')
  );
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.admin_profiles
    where id = auth.uid()
      and is_active = true
      and role = 'super_admin'
  );
$$;

insert into public.admin_profiles (id, role, display_name, is_active)
select auth_user.id, 'super_admin'::public.admin_role, 'Super Admin Eureka', true
from auth.users auth_user
where lower(auth_user.email) = 'ariasvincent292@gmail.com'
on conflict (id) do update
set role = 'super_admin',
    display_name = coalesce(public.admin_profiles.display_name, excluded.display_name),
    is_active = true,
    updated_at = now();

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_email text,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_logs_created_at_idx
on public.admin_audit_logs (created_at desc);

create index if not exists admin_audit_logs_entity_idx
on public.admin_audit_logs (entity_type, entity_id);

alter table public.admin_audit_logs enable row level security;

drop policy if exists "Super admins can read audit logs" on public.admin_audit_logs;
create policy "Super admins can read audit logs"
on public.admin_audit_logs
for select
to authenticated
using (public.is_super_admin());

create or replace function public.storage_object_name(p_path text, p_bucket text)
returns text
language plpgsql
immutable
as $$
declare
  marker text;
  marker_index integer;
  object_name text;
begin
  if nullif(trim(coalesce(p_path, '')), '') is null then
    return null;
  end if;

  marker = '/storage/v1/object/public/' || p_bucket || '/';
  marker_index = position(marker in p_path);

  if marker_index > 0 then
    object_name = substring(p_path from marker_index + length(marker));
  elsif p_path like p_bucket || '/%' then
    object_name = substring(p_path from length(p_bucket) + 2);
  else
    object_name = regexp_replace(p_path, '^/+', '');
  end if;

  if object_name like 'http%' then
    return null;
  end if;

  return nullif(object_name, '');
end;
$$;

create or replace function public.delete_storage_object_if_exists(p_bucket text, p_path text)
returns void
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  object_name text;
begin
  object_name = public.storage_object_name(p_path, p_bucket);
  if object_name is null then
    return;
  end if;

  delete from storage.objects
  where bucket_id = p_bucket
    and name = object_name;
end;
$$;

create or replace function public.log_super_admin_action(
  p_action text,
  p_entity_type text,
  p_entity_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_email_value text;
begin
  if not public.is_super_admin() then
    raise exception 'No autorizado';
  end if;

  select email
  into actor_email_value
  from auth.users
  where id = auth.uid();

  insert into public.admin_audit_logs (
    actor_user_id,
    actor_email,
    action,
    entity_type,
    entity_id,
    metadata
  )
  values (
    auth.uid(),
    actor_email_value,
    p_action,
    p_entity_type,
    p_entity_id,
    coalesce(p_metadata, '{}'::jsonb)
  );
end;
$$;

create or replace function public.get_super_admin_overview()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not public.is_super_admin() then
    raise exception 'No autorizado';
  end if;

  select jsonb_build_object(
    'orders', jsonb_build_object(
      'total', (select count(*) from public.orders),
      'pending', (select count(*) from public.orders where order_status in ('new', 'pending_review')),
      'accepted', (select count(*) from public.orders where order_status in ('accepted', 'preparing', 'ready', 'delivered')),
      'rejected', (select count(*) from public.orders where order_status = 'rejected')
    ),
    'bookings', jsonb_build_object(
      'total', (select count(*) from public.bookings),
      'today', (select count(*) from public.bookings where (starts_at at time zone 'America/La_Paz')::date = (now() at time zone 'America/La_Paz')::date),
      'past', (select count(*) from public.bookings where starts_at < now()),
      'pending', (select count(*) from public.bookings where status in ('pending_payment', 'pendiente_verificacion'))
    ),
    'paymentQrs', jsonb_build_object(
      'total', (select count(*) from public.payment_qrs),
      'active', (select count(*) from public.payment_qrs where is_active = true),
      'history', (select count(*) from public.payment_qr_history)
    ),
    'catalog', jsonb_build_object(
      'products', (select count(*) from public.products),
      'activeProducts', (select count(*) from public.products where is_active = true),
      'categories', (select count(*) from public.product_categories)
    ),
    'tables', jsonb_build_object(
      'total', (select count(*) from public.restaurant_tables),
      'active', (select count(*) from public.restaurant_tables where is_active = true)
    ),
    'auditLogs', jsonb_build_object(
      'total', (select count(*) from public.admin_audit_logs),
      'latest', (
        select coalesce(jsonb_agg(log_row order by (log_row->>'createdAt') desc), '[]'::jsonb)
        from (
          select jsonb_build_object(
            'id', id,
            'actorEmail', actor_email,
            'action', action,
            'entityType', entity_type,
            'entityId', entity_id,
            'createdAt', created_at,
            'metadata', metadata
          ) as log_row
          from public.admin_audit_logs
          order by created_at desc
          limit 8
        ) latest_logs
      )
    )
  )
  into result;

  return result;
end;
$$;

create or replace function public.super_admin_delete_entity(
  p_entity_type text,
  p_entity_id uuid,
  p_confirmation text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer := 0;
  related_orders_count integer := 0;
  file_path text;
  product_image_path text;
  category_image_path text;
begin
  if not public.is_super_admin() then
    raise exception 'No autorizado';
  end if;

  if p_entity_id is null then
    raise exception 'Falta el registro a eliminar.';
  end if;

  case p_entity_type
    when 'order' then
      for file_path in
        select image_path from public.payment_receipts where order_id = p_entity_id and is_deleted = false
      loop
        perform public.delete_storage_object_if_exists('receipts', file_path);
      end loop;

      delete from public.orders where id = p_entity_id;
      get diagnostics deleted_count = row_count;
      perform public.log_super_admin_action('DELETE_ORDER', 'order', p_entity_id, jsonb_build_object('deleted', deleted_count));

    when 'booking' then
      select payment_receipt_path into file_path from public.bookings where id = p_entity_id;
      perform public.delete_storage_object_if_exists('payments', file_path);

      delete from public.bookings where id = p_entity_id;
      get diagnostics deleted_count = row_count;
      perform public.log_super_admin_action('DELETE_RESERVATION', 'booking', p_entity_id, jsonb_build_object('deleted', deleted_count));

    when 'payment_qr' then
      if exists (select 1 from public.payment_qrs where id = p_entity_id and is_active = true)
        and p_confirmation <> 'RESET QR' then
        raise exception 'Escribe RESET QR para eliminar un QR activo.';
      end if;

      select image_path into file_path from public.payment_qrs where id = p_entity_id;
      perform public.delete_storage_object_if_exists('qr', file_path);

      delete from public.payment_qrs where id = p_entity_id;
      get diagnostics deleted_count = row_count;
      perform public.log_super_admin_action('DELETE_PAYMENT_QR', 'payment_qr', p_entity_id, jsonb_build_object('deleted', deleted_count));

    when 'product' then
      select image_path into product_image_path from public.products where id = p_entity_id;
      perform public.delete_storage_object_if_exists('products', product_image_path);

      delete from public.products where id = p_entity_id;
      get diagnostics deleted_count = row_count;
      perform public.log_super_admin_action('DELETE_PRODUCT', 'product', p_entity_id, jsonb_build_object('deleted', deleted_count));

    when 'product_category' then
      if p_confirmation <> 'ELIMINAR CATEGORIA' then
        raise exception 'Escribe ELIMINAR CATEGORIA para eliminar una categoria y sus productos.';
      end if;

      for product_image_path in select image_path from public.products where category_id = p_entity_id
      loop
        perform public.delete_storage_object_if_exists('products', product_image_path);
      end loop;

      select image_path into category_image_path from public.product_categories where id = p_entity_id;
      perform public.delete_storage_object_if_exists('products', category_image_path);

      delete from public.products where category_id = p_entity_id;
      delete from public.product_categories where id = p_entity_id;
      get diagnostics deleted_count = row_count;
      perform public.log_super_admin_action('DELETE_PRODUCT_CATEGORY', 'product_category', p_entity_id, jsonb_build_object('deleted', deleted_count));

    when 'restaurant_table' then
      if exists (select 1 from public.orders where table_id = p_entity_id)
        and p_confirmation <> 'ELIMINAR MESA' then
        raise exception 'Escribe ELIMINAR MESA para eliminar esta mesa y sus pedidos.';
      end if;

      for file_path in
        select receipt.image_path
        from public.payment_receipts receipt
        join public.orders order_row on order_row.id = receipt.order_id
        where order_row.table_id = p_entity_id
          and receipt.is_deleted = false
      loop
        perform public.delete_storage_object_if_exists('receipts', file_path);
      end loop;

      select count(*) into related_orders_count from public.orders where table_id = p_entity_id;
      delete from public.orders where table_id = p_entity_id;
      delete from public.restaurant_tables where id = p_entity_id;
      get diagnostics deleted_count = row_count;
      perform public.log_super_admin_action(
        'DELETE_TABLE',
        'restaurant_table',
        p_entity_id,
        jsonb_build_object('deleted', deleted_count, 'relatedOrders', related_orders_count)
      );

    else
      raise exception 'Tipo de entidad no permitido.';
  end case;

  return jsonb_build_object('ok', true, 'deleted', deleted_count);
end;
$$;

create or replace function public.super_admin_bulk_action(
  p_action text,
  p_confirmation text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  affected_count integer := 0;
  secondary_count integer := 0;
  file_path text;
begin
  if not public.is_super_admin() then
    raise exception 'No autorizado';
  end if;

  case p_action
    when 'delete_all_orders' then
      if p_confirmation <> 'ELIMINAR PEDIDOS' then
        raise exception 'Confirmacion incorrecta.';
      end if;

      select count(*) into affected_count from public.orders;
      for file_path in select image_path from public.payment_receipts where is_deleted = false
      loop
        perform public.delete_storage_object_if_exists('receipts', file_path);
      end loop;
      delete from public.orders;
      perform public.log_super_admin_action('DELETE_ALL_ORDERS', 'orders', null, jsonb_build_object('deleted', affected_count));

    when 'delete_rejected_orders' then
      if p_confirmation <> 'ELIMINAR RECHAZADOS' then
        raise exception 'Confirmacion incorrecta.';
      end if;

      select count(*) into affected_count from public.orders where order_status = 'rejected';
      for file_path in
        select receipt.image_path
        from public.payment_receipts receipt
        join public.orders order_row on order_row.id = receipt.order_id
        where order_row.order_status = 'rejected'
          and receipt.is_deleted = false
      loop
        perform public.delete_storage_object_if_exists('receipts', file_path);
      end loop;
      delete from public.orders where order_status = 'rejected';
      perform public.log_super_admin_action('DELETE_REJECTED_ORDERS', 'orders', null, jsonb_build_object('deleted', affected_count));

    when 'delete_all_bookings' then
      if p_confirmation <> 'ELIMINAR RESERVAS' then
        raise exception 'Confirmacion incorrecta.';
      end if;

      select count(*) into affected_count from public.bookings;
      for file_path in select payment_receipt_path from public.bookings where payment_receipt_path is not null
      loop
        perform public.delete_storage_object_if_exists('payments', file_path);
      end loop;
      delete from public.bookings;
      perform public.log_super_admin_action('DELETE_ALL_RESERVATIONS', 'bookings', null, jsonb_build_object('deleted', affected_count));

    when 'delete_past_bookings' then
      if p_confirmation <> 'ELIMINAR RESERVAS PASADAS' then
        raise exception 'Confirmacion incorrecta.';
      end if;

      select count(*) into affected_count from public.bookings where starts_at < now();
      for file_path in select payment_receipt_path from public.bookings where starts_at < now() and payment_receipt_path is not null
      loop
        perform public.delete_storage_object_if_exists('payments', file_path);
      end loop;
      delete from public.bookings where starts_at < now();
      perform public.log_super_admin_action('DELETE_PAST_RESERVATIONS', 'bookings', null, jsonb_build_object('deleted', affected_count));

    when 'reset_payment_qr' then
      if p_confirmation <> 'RESET QR' then
        raise exception 'Confirmacion incorrecta.';
      end if;

      select count(*) into affected_count from public.payment_qrs;
      select count(*) into secondary_count from public.payment_qr_history;
      for file_path in select image_path from public.payment_qrs
      loop
        perform public.delete_storage_object_if_exists('qr', file_path);
      end loop;
      delete from public.payment_qr_history;
      delete from public.payment_qrs;
      perform public.log_super_admin_action(
        'RESET_PAYMENT_QR',
        'payment_qrs',
        null,
        jsonb_build_object('deletedQrs', affected_count, 'deletedHistory', secondary_count)
      );

    when 'delete_catalog' then
      if p_confirmation <> 'ELIMINAR CATALOGO' then
        raise exception 'Confirmacion incorrecta.';
      end if;

      select count(*) into affected_count from public.products;
      select count(*) into secondary_count from public.product_categories;
      for file_path in
        select image_path from public.products where image_path is not null
        union all
        select image_path from public.product_categories where image_path is not null
      loop
        perform public.delete_storage_object_if_exists('products', file_path);
      end loop;
      delete from public.products;
      delete from public.product_categories;
      perform public.log_super_admin_action(
        'DELETE_CATALOG',
        'catalog',
        null,
        jsonb_build_object('deletedProducts', affected_count, 'deletedCategories', secondary_count)
      );

    when 'delete_tables' then
      if p_confirmation <> 'ELIMINAR MESAS' then
        raise exception 'Confirmacion incorrecta.';
      end if;

      select count(*) into affected_count from public.restaurant_tables;
      select count(*) into secondary_count from public.orders;
      for file_path in select image_path from public.payment_receipts where is_deleted = false
      loop
        perform public.delete_storage_object_if_exists('receipts', file_path);
      end loop;
      delete from public.orders;
      delete from public.restaurant_tables;
      perform public.log_super_admin_action(
        'DELETE_TABLES',
        'restaurant_tables',
        null,
        jsonb_build_object('deletedTables', affected_count, 'deletedOrders', secondary_count)
      );

    when 'cleanup_old_receipts' then
      if p_confirmation <> 'LIMPIAR COMPROBANTES' then
        raise exception 'Confirmacion incorrecta.';
      end if;

      for file_path in
        select image_path
        from public.payment_receipts
        where expires_at < now()
          and is_deleted = false
      loop
        perform public.delete_storage_object_if_exists('receipts', file_path);
      end loop;

      update public.payment_receipts
      set is_deleted = true
      where expires_at < now()
        and is_deleted = false;
      get diagnostics affected_count = row_count;
      perform public.log_super_admin_action('CLEANUP_OLD_RECEIPTS', 'payment_receipts', null, jsonb_build_object('updated', affected_count));

    else
      raise exception 'Accion no permitida.';
  end case;

  return jsonb_build_object('ok', true, 'affected', affected_count, 'secondary', secondary_count);
end;
$$;

grant execute on function public.is_super_admin() to authenticated;
grant execute on function public.get_super_admin_overview() to authenticated;
grant execute on function public.super_admin_delete_entity(text, uuid, text) to authenticated;
grant execute on function public.super_admin_bulk_action(text, text) to authenticated;
