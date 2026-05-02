set check_function_bodies = off;

do $$
begin
  alter type public.booking_status add value if not exists 'paid';
  alter type public.booking_status add value if not exists 'in_game';
  alter type public.booking_status add value if not exists 'completed';
  alter type public.booking_status add value if not exists 'no_show';
exception
  when duplicate_object then null;
end $$;

alter table public.bookings
  add column if not exists payment_status text not null default 'pending' check (payment_status in ('pending', 'paid', 'rejected', 'cancelled')),
  add column if not exists paid_at timestamptz,
  add column if not exists payment_method text check (payment_method in ('cash', 'qr', 'card', 'transfer', 'other')),
  add column if not exists cash_session_id uuid,
  add column if not exists started_at timestamptz,
  add column if not exists finished_at timestamptz,
  add column if not exists duration_played_minutes integer;

create table if not exists public.cash_sessions (
  id uuid primary key default gen_random_uuid(),
  opened_by uuid references auth.users(id) on delete set null,
  opened_by_email text,
  opened_at timestamptz not null default now(),
  closed_by uuid references auth.users(id) on delete set null,
  closed_by_email text,
  closed_at timestamptz,
  opening_cash_amount numeric(10, 2) not null default 0 check (opening_cash_amount >= 0),
  closing_cash_counted numeric(10, 2) check (closing_cash_counted >= 0),
  expected_cash_amount numeric(10, 2),
  difference_amount numeric(10, 2),
  status text not null default 'open' check (status in ('open', 'closed', 'cancelled')),
  notes text,
  closing_notes text,
  session_date date not null default ((now() at time zone 'America/La_Paz')::date),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists cash_sessions_one_open_per_day_idx
on public.cash_sessions (session_date)
where status = 'open';

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  cash_session_id uuid not null references public.cash_sessions(id) on delete restrict,
  source_type text not null check (source_type in ('reservation', 'table_order', 'pos_sale', 'manual_income')),
  source_id uuid,
  customer_name text,
  customer_phone text,
  amount numeric(10, 2) not null check (amount > 0),
  payment_method text not null check (payment_method in ('cash', 'qr', 'card', 'transfer', 'other')),
  payment_status text not null default 'confirmed' check (payment_status in ('pending', 'confirmed', 'rejected', 'cancelled')),
  receipt_image_path text,
  receipt_expires_at timestamptz,
  receipt_deleted_at timestamptz,
  receipt_is_deleted boolean not null default false,
  confirmed_by uuid references auth.users(id) on delete set null,
  confirmed_at timestamptz,
  notes text,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id) on delete set null,
  delete_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists payments_unique_active_source_idx
on public.payments (source_type, source_id)
where source_id is not null and payment_status in ('pending', 'confirmed') and is_deleted = false;

create table if not exists public.pos_sales (
  id uuid primary key default gen_random_uuid(),
  cash_session_id uuid not null references public.cash_sessions(id) on delete restrict,
  sale_number text not null unique default ('PV-' || to_char(now() at time zone 'America/La_Paz', 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6))),
  customer_name text,
  customer_phone text,
  subtotal numeric(10, 2) not null default 0 check (subtotal >= 0),
  discount_amount numeric(10, 2) not null default 0 check (discount_amount >= 0),
  total numeric(10, 2) not null default 0 check (total >= 0),
  payment_method text not null check (payment_method in ('cash', 'qr', 'card', 'transfer', 'other')),
  payment_status text not null default 'confirmed' check (payment_status in ('pending', 'confirmed', 'rejected', 'cancelled')),
  receipt_image_path text,
  receipt_expires_at timestamptz,
  notes text,
  status text not null default 'completed' check (status in ('completed', 'cancelled', 'refunded')),
  created_by uuid references auth.users(id) on delete set null,
  created_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id) on delete set null,
  delete_reason text
);

create table if not exists public.pos_sale_items (
  id uuid primary key default gen_random_uuid(),
  pos_sale_id uuid not null references public.pos_sales(id) on delete restrict,
  product_id uuid references public.products(id) on delete set null,
  product_name_snapshot text not null,
  variant_id uuid references public.product_variants(id) on delete set null,
  variant_name_snapshot text,
  quantity integer not null check (quantity > 0),
  unit_price numeric(10, 2) not null check (unit_price >= 0),
  total_price numeric(10, 2) not null check (total_price >= 0),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.pos_sale_item_options (
  id uuid primary key default gen_random_uuid(),
  pos_sale_item_id uuid not null references public.pos_sale_items(id) on delete restrict,
  option_group_name_snapshot text not null,
  option_name_snapshot text not null,
  extra_price numeric(10, 2) not null default 0 check (extra_price >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cash_expenses (
  id uuid primary key default gen_random_uuid(),
  cash_session_id uuid not null references public.cash_sessions(id) on delete restrict,
  category_id uuid references public.expense_categories(id) on delete set null,
  amount numeric(10, 2) not null check (amount > 0),
  payment_method text not null check (payment_method in ('cash', 'qr', 'transfer', 'card', 'other')),
  reason text not null,
  description text,
  receipt_image_path text,
  created_by uuid references auth.users(id) on delete set null,
  created_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id) on delete set null,
  delete_reason text
);

create table if not exists public.cash_movements (
  id uuid primary key default gen_random_uuid(),
  cash_session_id uuid not null references public.cash_sessions(id) on delete restrict,
  movement_type text not null check (movement_type in ('income', 'expense', 'sale', 'reservation_payment', 'table_order_payment', 'pos_sale', 'manual_income', 'refund', 'cancellation', 'adjustment')),
  source_type text,
  source_id uuid,
  description text not null,
  amount numeric(10, 2) not null check (amount >= 0),
  payment_method text not null check (payment_method in ('cash', 'qr', 'card', 'transfer', 'other')),
  direction text not null check (direction in ('in', 'out')),
  status text not null default 'active' check (status in ('active', 'cancelled')),
  created_by uuid references auth.users(id) on delete set null,
  created_by_email text,
  created_at timestamptz not null default now(),
  cancelled_at timestamptz,
  cancelled_by uuid references auth.users(id) on delete set null,
  cancellation_reason text,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id) on delete set null,
  delete_reason text
);

create table if not exists public.cash_closure_reports (
  id uuid primary key default gen_random_uuid(),
  cash_session_id uuid not null unique references public.cash_sessions(id) on delete restrict,
  report_date date not null,
  opening_cash_amount numeric(10, 2) not null,
  total_cash_income numeric(10, 2) not null default 0,
  total_qr_income numeric(10, 2) not null default 0,
  total_card_income numeric(10, 2) not null default 0,
  total_transfer_income numeric(10, 2) not null default 0,
  total_expenses numeric(10, 2) not null default 0,
  total_reservation_payments numeric(10, 2) not null default 0,
  total_table_order_payments numeric(10, 2) not null default 0,
  total_pos_sales numeric(10, 2) not null default 0,
  total_manual_income numeric(10, 2) not null default 0,
  expected_cash_amount numeric(10, 2) not null default 0,
  counted_cash_amount numeric(10, 2) not null default 0,
  difference_amount numeric(10, 2) not null default 0,
  closed_by uuid references auth.users(id) on delete set null,
  closed_by_email text,
  closed_at timestamptz not null default now(),
  report_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.cash_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_email text,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  old_values jsonb,
  new_values jsonb,
  reason text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists cash_movements_session_idx on public.cash_movements (cash_session_id, created_at desc);
create index if not exists cash_movements_source_idx on public.cash_movements (source_type, source_id);
create index if not exists payments_session_idx on public.payments (cash_session_id, created_at desc);
create index if not exists pos_sales_session_idx on public.pos_sales (cash_session_id, created_at desc);
create index if not exists cash_expenses_session_idx on public.cash_expenses (cash_session_id, created_at desc);
create index if not exists cash_audit_logs_created_idx on public.cash_audit_logs (created_at desc);

drop trigger if exists set_cash_sessions_updated_at on public.cash_sessions;
create trigger set_cash_sessions_updated_at before update on public.cash_sessions for each row execute function public.set_updated_at();
drop trigger if exists set_payments_updated_at on public.payments;
create trigger set_payments_updated_at before update on public.payments for each row execute function public.set_updated_at();
drop trigger if exists set_pos_sales_updated_at on public.pos_sales;
create trigger set_pos_sales_updated_at before update on public.pos_sales for each row execute function public.set_updated_at();
drop trigger if exists set_cash_expenses_updated_at on public.cash_expenses;
create trigger set_cash_expenses_updated_at before update on public.cash_expenses for each row execute function public.set_updated_at();
drop trigger if exists set_expense_categories_updated_at on public.expense_categories;
create trigger set_expense_categories_updated_at before update on public.expense_categories for each row execute function public.set_updated_at();

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'bookings_cash_session_id_fkey') then
    alter table public.bookings
      add constraint bookings_cash_session_id_fkey foreign key (cash_session_id) references public.cash_sessions(id) on delete set null;
  end if;
end $$;

alter table public.cash_sessions enable row level security;
alter table public.payments enable row level security;
alter table public.pos_sales enable row level security;
alter table public.pos_sale_items enable row level security;
alter table public.pos_sale_item_options enable row level security;
alter table public.cash_expenses enable row level security;
alter table public.expense_categories enable row level security;
alter table public.cash_movements enable row level security;
alter table public.cash_closure_reports enable row level security;
alter table public.cash_audit_logs enable row level security;

drop policy if exists "Admins can manage cash sessions" on public.cash_sessions;
create policy "Admins can manage cash sessions" on public.cash_sessions for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Admins can manage payments" on public.payments;
create policy "Admins can manage payments" on public.payments for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Admins can manage pos sales" on public.pos_sales;
create policy "Admins can manage pos sales" on public.pos_sales for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Admins can manage pos sale items" on public.pos_sale_items;
create policy "Admins can manage pos sale items" on public.pos_sale_items for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Admins can manage pos sale item options" on public.pos_sale_item_options;
create policy "Admins can manage pos sale item options" on public.pos_sale_item_options for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Admins can manage cash expenses" on public.cash_expenses;
create policy "Admins can manage cash expenses" on public.cash_expenses for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Admins can manage expense categories" on public.expense_categories;
create policy "Admins can manage expense categories" on public.expense_categories for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Admins can manage cash movements" on public.cash_movements;
create policy "Admins can manage cash movements" on public.cash_movements for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Admins can read cash closure reports" on public.cash_closure_reports;
create policy "Admins can read cash closure reports" on public.cash_closure_reports for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Super admins can read cash audit logs" on public.cash_audit_logs;
create policy "Super admins can read cash audit logs" on public.cash_audit_logs for select to authenticated using (public.is_super_admin());
drop policy if exists "Admins can insert cash audit logs" on public.cash_audit_logs;
create policy "Admins can insert cash audit logs" on public.cash_audit_logs for insert to authenticated with check (public.is_admin());

insert into public.expense_categories (name, description)
values
  ('Insumos', 'Compra de insumos para operacion'),
  ('Proveedor', 'Pagos a proveedores'),
  ('Limpieza', 'Gastos de limpieza'),
  ('Mantenimiento', 'Mantenimiento del local o equipos'),
  ('Devolucion', 'Devoluciones a clientes'),
  ('Transporte', 'Movilidad y transporte'),
  ('Otros', 'Otros egresos')
on conflict (name) do nothing;

insert into public.site_settings (key, value, is_public)
values ('cash_authorization_key', jsonb_build_object('hash', extensions.crypt('EUREKA-CAJA-2026', extensions.gen_salt('bf'))), false)
on conflict (key) do nothing;

create or replace function public.cash_actor_email()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select email from auth.users where id = auth.uid();
$$;

create or replace function public.log_cash_action(
  p_action text,
  p_entity_type text,
  p_entity_id uuid default null,
  p_old_values jsonb default null,
  p_new_values jsonb default null,
  p_reason text default null,
  p_metadata jsonb default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.cash_audit_logs (
    actor_user_id,
    actor_email,
    action,
    entity_type,
    entity_id,
    old_values,
    new_values,
    reason,
    metadata
  )
  values (
    auth.uid(),
    public.cash_actor_email(),
    p_action,
    p_entity_type,
    p_entity_id,
    p_old_values,
    p_new_values,
    p_reason,
    coalesce(p_metadata, '{}'::jsonb)
  );
end;
$$;

create or replace function public.require_cash_admin()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'No autorizado';
  end if;
end;
$$;

create or replace function public.verify_cash_authorization_key(p_key text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  stored_hash text;
begin
  perform public.require_cash_admin();
  select value->>'hash' into stored_hash from public.site_settings where key = 'cash_authorization_key';
  return stored_hash is not null and stored_hash = extensions.crypt(coalesce(p_key, ''), stored_hash);
end;
$$;

create or replace function public.get_open_cash_session()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  session_row public.cash_sessions;
begin
  perform public.require_cash_admin();
  select * into session_row
  from public.cash_sessions
  where status = 'open'
  order by opened_at desc
  limit 1;

  if session_row.id is null then
    return null;
  end if;

  return to_jsonb(session_row);
end;
$$;

create or replace function public.open_cash_session(p_opening_cash_amount numeric, p_notes text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_session public.cash_sessions;
begin
  perform public.require_cash_admin();

  if exists (
    select 1
    from public.cash_sessions
    where session_date = (now() at time zone 'America/La_Paz')::date
      and status = 'open'
  ) then
    raise exception 'Ya existe una caja abierta para hoy.';
  end if;

  insert into public.cash_sessions (
    opened_by,
    opened_by_email,
    opening_cash_amount,
    notes
  )
  values (
    auth.uid(),
    public.cash_actor_email(),
    greatest(coalesce(p_opening_cash_amount, 0), 0),
    nullif(trim(coalesce(p_notes, '')), '')
  )
  returning * into inserted_session;

  perform public.log_cash_action('OPEN_CASH_SESSION', 'cash_session', inserted_session.id, null, to_jsonb(inserted_session), null, null);
  return inserted_session.id;
end;
$$;

create or replace function public.require_open_cash_session()
returns public.cash_sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  session_row public.cash_sessions;
begin
  perform public.require_cash_admin();
  select * into session_row
  from public.cash_sessions
  where status = 'open'
  order by opened_at desc
  limit 1
  for update;

  if session_row.id is null then
    raise exception 'Debes abrir caja antes de registrar movimientos.';
  end if;

  return session_row;
end;
$$;

create or replace function public.insert_cash_movement(
  p_cash_session_id uuid,
  p_movement_type text,
  p_source_type text,
  p_source_id uuid,
  p_description text,
  p_amount numeric,
  p_payment_method text,
  p_direction text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  movement_id uuid;
begin
  insert into public.cash_movements (
    cash_session_id,
    movement_type,
    source_type,
    source_id,
    description,
    amount,
    payment_method,
    direction,
    created_by,
    created_by_email
  )
  values (
    p_cash_session_id,
    p_movement_type,
    p_source_type,
    p_source_id,
    p_description,
    round(p_amount, 2),
    p_payment_method,
    p_direction,
    auth.uid(),
    public.cash_actor_email()
  )
  returning id into movement_id;

  return movement_id;
end;
$$;

create or replace function public.create_manual_cash_income(
  p_amount numeric,
  p_payment_method text,
  p_description text,
  p_customer_name text default null,
  p_customer_phone text default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  session_row public.cash_sessions;
  payment_row public.payments;
begin
  session_row = public.require_open_cash_session();

  if coalesce(p_amount, 0) <= 0 then
    raise exception 'El monto debe ser mayor a cero.';
  end if;

  insert into public.payments (
    cash_session_id,
    source_type,
    source_id,
    customer_name,
    customer_phone,
    amount,
    payment_method,
    payment_status,
    confirmed_by,
    confirmed_at,
    notes
  )
  values (
    session_row.id,
    'manual_income',
    null,
    nullif(trim(coalesce(p_customer_name, '')), ''),
    nullif(trim(coalesce(p_customer_phone, '')), ''),
    round(p_amount, 2),
    p_payment_method,
    'confirmed',
    auth.uid(),
    now(),
    nullif(trim(coalesce(p_notes, '')), '')
  )
  returning * into payment_row;

  perform public.insert_cash_movement(session_row.id, 'manual_income', 'manual_income', payment_row.id, coalesce(nullif(trim(p_description), ''), 'Ingreso manual'), payment_row.amount, payment_row.payment_method, 'in');
  perform public.log_cash_action('CREATE_MANUAL_INCOME', 'payment', payment_row.id, null, to_jsonb(payment_row), null, null);
  return payment_row.id;
end;
$$;

create or replace function public.create_cash_expense(
  p_amount numeric,
  p_payment_method text,
  p_reason text,
  p_category_id uuid default null,
  p_description text default null,
  p_receipt_image_path text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  session_row public.cash_sessions;
  expense_row public.cash_expenses;
begin
  session_row = public.require_open_cash_session();

  if coalesce(p_amount, 0) <= 0 then
    raise exception 'El monto debe ser mayor a cero.';
  end if;

  if nullif(trim(coalesce(p_reason, '')), '') is null then
    raise exception 'El motivo es obligatorio.';
  end if;

  insert into public.cash_expenses (
    cash_session_id,
    category_id,
    amount,
    payment_method,
    reason,
    description,
    receipt_image_path,
    created_by,
    created_by_email
  )
  values (
    session_row.id,
    p_category_id,
    round(p_amount, 2),
    p_payment_method,
    trim(p_reason),
    nullif(trim(coalesce(p_description, '')), ''),
    nullif(trim(coalesce(p_receipt_image_path, '')), ''),
    auth.uid(),
    public.cash_actor_email()
  )
  returning * into expense_row;

  perform public.insert_cash_movement(session_row.id, 'expense', 'cash_expense', expense_row.id, expense_row.reason, expense_row.amount, expense_row.payment_method, 'out');
  perform public.log_cash_action('CREATE_EXPENSE', 'cash_expense', expense_row.id, null, to_jsonb(expense_row), null, null);
  return expense_row.id;
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

create or replace function public.register_reservation_payment(
  p_booking_id uuid,
  p_payment_method text,
  p_receipt_image_path text default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  session_row public.cash_sessions;
  booking_row public.bookings;
  payment_row public.payments;
begin
  session_row = public.require_open_cash_session();

  select * into booking_row from public.bookings where id = p_booking_id for update;
  if booking_row.id is null then
    raise exception 'Reserva no encontrada.';
  end if;

  if exists (
    select 1 from public.payments
    where source_type = 'reservation'
      and source_id = p_booking_id
      and payment_status in ('pending', 'confirmed')
      and is_deleted = false
  ) or booking_row.payment_status = 'paid' then
    raise exception 'Esta reserva ya tiene un pago registrado.';
  end if;

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
    'reservation',
    booking_row.id,
    booking_row.full_name,
    booking_row.phone,
    booking_row.amount_due,
    p_payment_method,
    'confirmed',
    nullif(trim(coalesce(p_receipt_image_path, '')), ''),
    case when p_payment_method = 'qr' and nullif(trim(coalesce(p_receipt_image_path, '')), '') is not null then now() + interval '7 days' else null end,
    auth.uid(),
    now(),
    nullif(trim(coalesce(p_notes, '')), '')
  )
  returning * into payment_row;

  update public.bookings
  set payment_status = 'paid',
      paid_at = now(),
      payment_method = p_payment_method,
      cash_session_id = session_row.id,
      status = 'paid'::public.booking_status,
      confirmed_at = coalesce(confirmed_at, now())
  where id = booking_row.id;

  perform public.insert_cash_movement(session_row.id, 'reservation_payment', 'reservation', booking_row.id, 'Pago reserva ' || booking_row.reservation_code, payment_row.amount, payment_row.payment_method, 'in');
  perform public.log_cash_action('REGISTER_RESERVATION_PAYMENT', 'booking', booking_row.id, to_jsonb(booking_row), jsonb_build_object('paymentId', payment_row.id, 'status', 'paid'), null, null);
  return payment_row.id;
end;
$$;

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

  perform public.insert_cash_movement(session_row.id, 'table_order_payment', 'table_order', order_row.id, 'Pago pedido ' || order_row.order_code, payment_row.amount, payment_row.payment_method, 'in');
  perform public.log_cash_action('REGISTER_TABLE_ORDER_PAYMENT', 'order', order_row.id, to_jsonb(order_row), jsonb_build_object('paymentId', payment_row.id, 'paymentStatus', 'paid'), null, null);
  return payment_row.id;
end;
$$;

create or replace function public.cash_summary_for_session(p_cash_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  session_row public.cash_sessions;
  result jsonb;
begin
  perform public.require_cash_admin();
  select * into session_row from public.cash_sessions where id = p_cash_session_id;
  if session_row.id is null then
    raise exception 'Caja no encontrada.';
  end if;

  select jsonb_build_object(
    'sessionId', session_row.id,
    'sessionDate', session_row.session_date,
    'status', session_row.status,
    'openingCashAmount', session_row.opening_cash_amount,
    'openedByEmail', session_row.opened_by_email,
    'openedAt', session_row.opened_at,
    'closedByEmail', session_row.closed_by_email,
    'closedAt', session_row.closed_at,
    'totalCashIncome', coalesce(sum(amount) filter (where direction = 'in' and payment_method = 'cash' and status = 'active' and is_deleted = false), 0),
    'totalQrIncome', coalesce(sum(amount) filter (where direction = 'in' and payment_method = 'qr' and status = 'active' and is_deleted = false), 0),
    'totalCardIncome', coalesce(sum(amount) filter (where direction = 'in' and payment_method = 'card' and status = 'active' and is_deleted = false), 0),
    'totalTransferIncome', coalesce(sum(amount) filter (where direction = 'in' and payment_method = 'transfer' and status = 'active' and is_deleted = false), 0),
    'totalExpenses', coalesce(sum(amount) filter (where direction = 'out' and status = 'active' and is_deleted = false), 0),
    'totalCashExpenses', coalesce(sum(amount) filter (where direction = 'out' and payment_method = 'cash' and status = 'active' and is_deleted = false), 0),
    'totalReservationPayments', coalesce(sum(amount) filter (where movement_type = 'reservation_payment' and status = 'active' and is_deleted = false), 0),
    'totalTableOrderPayments', coalesce(sum(amount) filter (where movement_type = 'table_order_payment' and status = 'active' and is_deleted = false), 0),
    'totalPosSales', coalesce(sum(amount) filter (where movement_type = 'pos_sale' and status = 'active' and is_deleted = false), 0),
    'totalManualIncome', coalesce(sum(amount) filter (where movement_type = 'manual_income' and status = 'active' and is_deleted = false), 0),
    'totalCancellations', coalesce(sum(amount) filter (where status = 'cancelled'), 0),
    'expectedCashAmount', session_row.opening_cash_amount
      + coalesce(sum(amount) filter (where direction = 'in' and payment_method = 'cash' and status = 'active' and is_deleted = false), 0)
      - coalesce(sum(amount) filter (where direction = 'out' and payment_method = 'cash' and status = 'active' and is_deleted = false), 0),
    'grossIncome', coalesce(sum(amount) filter (where direction = 'in' and status = 'active' and is_deleted = false), 0)
  )
  into result
  from public.cash_movements
  where cash_session_id = session_row.id;

  return result;
end;
$$;

create or replace function public.close_cash_session(p_counted_cash_amount numeric, p_closing_notes text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  session_row public.cash_sessions;
  summary jsonb;
  report_row public.cash_closure_reports;
  expected_cash numeric;
  counted_cash numeric;
begin
  session_row = public.require_open_cash_session();
  counted_cash = round(greatest(coalesce(p_counted_cash_amount, 0), 0), 2);
  summary = public.cash_summary_for_session(session_row.id);
  expected_cash = round((summary->>'expectedCashAmount')::numeric, 2);

  update public.cash_sessions
  set status = 'closed',
      closed_by = auth.uid(),
      closed_by_email = public.cash_actor_email(),
      closed_at = now(),
      closing_cash_counted = counted_cash,
      expected_cash_amount = expected_cash,
      difference_amount = counted_cash - expected_cash,
      closing_notes = nullif(trim(coalesce(p_closing_notes, '')), '')
  where id = session_row.id
  returning * into session_row;

  insert into public.cash_closure_reports (
    cash_session_id,
    report_date,
    opening_cash_amount,
    total_cash_income,
    total_qr_income,
    total_card_income,
    total_transfer_income,
    total_expenses,
    total_reservation_payments,
    total_table_order_payments,
    total_pos_sales,
    total_manual_income,
    expected_cash_amount,
    counted_cash_amount,
    difference_amount,
    closed_by,
    closed_by_email,
    closed_at,
    report_snapshot
  )
  values (
    session_row.id,
    session_row.session_date,
    session_row.opening_cash_amount,
    (summary->>'totalCashIncome')::numeric,
    (summary->>'totalQrIncome')::numeric,
    (summary->>'totalCardIncome')::numeric,
    (summary->>'totalTransferIncome')::numeric,
    (summary->>'totalExpenses')::numeric,
    (summary->>'totalReservationPayments')::numeric,
    (summary->>'totalTableOrderPayments')::numeric,
    (summary->>'totalPosSales')::numeric,
    (summary->>'totalManualIncome')::numeric,
    expected_cash,
    counted_cash,
    counted_cash - expected_cash,
    auth.uid(),
    public.cash_actor_email(),
    session_row.closed_at,
    summary || jsonb_build_object('closingNotes', session_row.closing_notes)
  )
  returning * into report_row;

  perform public.log_cash_action('CLOSE_CASH_SESSION', 'cash_session', session_row.id, null, to_jsonb(session_row), null, summary);
  return report_row.id;
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

create or replace function public.start_booking_game(p_booking_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  booking_row public.bookings;
begin
  perform public.require_cash_admin();
  select * into booking_row from public.bookings where id = p_booking_id for update;
  if booking_row.id is null then
    raise exception 'Reserva no encontrada.';
  end if;

  if booking_row.payment_status <> 'paid' and booking_row.status::text not in ('confirmed', 'paid') then
    raise exception 'La reserva debe estar pagada o confirmada para iniciar juego.';
  end if;

  update public.bookings
  set status = 'in_game'::public.booking_status,
      started_at = coalesce(started_at, now()),
      finished_at = null,
      duration_played_minutes = null
  where id = booking_row.id;

  perform public.log_cash_action('START_GAME', 'booking', booking_row.id, to_jsonb(booking_row), jsonb_build_object('status', 'in_game'), null, null);
end;
$$;

create or replace function public.finish_booking_game(p_booking_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  booking_row public.bookings;
  finished_value timestamptz := now();
begin
  perform public.require_cash_admin();
  select * into booking_row from public.bookings where id = p_booking_id for update;
  if booking_row.id is null then
    raise exception 'Reserva no encontrada.';
  end if;

  if booking_row.started_at is null then
    raise exception 'La reserva no tiene hora de inicio.';
  end if;

  update public.bookings
  set status = 'completed'::public.booking_status,
      finished_at = finished_value,
      duration_played_minutes = greatest(0, floor(extract(epoch from (finished_value - started_at)) / 60)::integer)
  where id = booking_row.id;

  perform public.log_cash_action('END_GAME', 'booking', booking_row.id, to_jsonb(booking_row), jsonb_build_object('status', 'completed'), null, null);
end;
$$;

create or replace function public.mark_booking_no_show(p_booking_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  booking_row public.bookings;
begin
  perform public.require_cash_admin();
  select * into booking_row from public.bookings where id = p_booking_id for update;
  if booking_row.id is null then
    raise exception 'Reserva no encontrada.';
  end if;

  update public.bookings
  set status = 'no_show'::public.booking_status,
      admin_notes = coalesce(nullif(trim(coalesce(p_reason, '')), ''), admin_notes)
  where id = booking_row.id;

  perform public.log_cash_action('UPDATE_RESERVATION_STATUS', 'booking', booking_row.id, to_jsonb(booking_row), jsonb_build_object('status', 'no_show'), p_reason, null);
end;
$$;

create or replace function public.cleanup_old_cash_receipts()
returns integer
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  updated_count integer := 0;
begin
  perform public.require_cash_admin();

  with expired_paths as (
    select receipt_image_path
    from public.payments
    where receipt_is_deleted = false
      and receipt_expires_at < now()
      and receipt_image_path like 'uploads/cash-receipts/%'
    union
    select receipt_image_path
    from public.pos_sales
    where receipt_expires_at < now()
      and receipt_image_path like 'uploads/cash-receipts/%'
  ),
  deleted_objects as (
    delete from storage.objects object
    using expired_paths path_row
    where object.bucket_id = 'receipts'
      and object.name = path_row.receipt_image_path
    returning object.name
  ),
  updated_payments as (
    update public.payments
    set receipt_is_deleted = true,
        receipt_deleted_at = now()
    where receipt_is_deleted = false
      and receipt_expires_at < now()
    returning id
  )
  select count(*) into updated_count from updated_payments;

  return updated_count;
end;
$$;

grant execute on function public.get_open_cash_session() to authenticated;
grant execute on function public.open_cash_session(numeric, text) to authenticated;
grant execute on function public.create_manual_cash_income(numeric, text, text, text, text, text) to authenticated;
grant execute on function public.create_cash_expense(numeric, text, text, uuid, text, text) to authenticated;
grant execute on function public.create_pos_sale(text, text, numeric, text, text, text, jsonb) to authenticated;
grant execute on function public.register_reservation_payment(uuid, text, text, text) to authenticated;
grant execute on function public.register_table_order_payment(uuid, text, text) to authenticated;
grant execute on function public.cash_summary_for_session(uuid) to authenticated;
grant execute on function public.close_cash_session(numeric, text) to authenticated;
grant execute on function public.cancel_cash_movement(uuid, text, text) to authenticated;
grant execute on function public.start_booking_game(uuid) to authenticated;
grant execute on function public.finish_booking_game(uuid) to authenticated;
grant execute on function public.mark_booking_no_show(uuid, text) to authenticated;
grant execute on function public.cleanup_old_cash_receipts() to authenticated;
