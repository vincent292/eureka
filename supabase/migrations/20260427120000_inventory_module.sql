set check_function_bodies = off;

do $$
begin
  create type public.inventory_unit_type as enum ('unit', 'weight', 'volume', 'length', 'package', 'other');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.inventory_batch_status as enum ('active', 'expired', 'depleted');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.inventory_movement_type as enum (
    'in',
    'out',
    'adjustment_in',
    'adjustment_out',
    'waste',
    'expired',
    'transfer',
    'purchase',
    'return',
    'internal_use',
    'correction'
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.inventory_count_type as enum ('daily', 'weekly', 'monthly', 'quarterly', 'annual', 'custom');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.inventory_count_status as enum ('draft', 'in_progress', 'completed', 'cancelled');
exception when duplicate_object then null;
end $$;

create table if not exists public.inventory_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  parent_id uuid references public.inventory_categories(id) on delete set null,
  color text,
  icon text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inventory_categories_name_parent_unique unique (name, parent_id)
);

create table if not exists public.inventory_units (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  abbreviation text not null unique,
  unit_type public.inventory_unit_type not null default 'unit',
  is_base_unit boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inventory_unit_conversions (
  id uuid primary key default gen_random_uuid(),
  from_unit_id uuid not null references public.inventory_units(id) on delete cascade,
  to_unit_id uuid not null references public.inventory_units(id) on delete cascade,
  factor numeric(18, 6) not null check (factor > 0),
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inventory_unit_conversions_unique unique (from_unit_id, to_unit_id)
);

create table if not exists public.inventory_locations (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inventory_suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_name text,
  phone text,
  email text,
  address text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  sku text unique,
  name text not null,
  description text,
  category_id uuid references public.inventory_categories(id) on delete set null,
  unit_id uuid not null references public.inventory_units(id) on delete restrict,
  current_stock numeric(18, 3) not null default 0 check (current_stock >= 0),
  minimum_stock numeric(18, 3) not null default 0 check (minimum_stock >= 0),
  maximum_stock numeric(18, 3) check (maximum_stock is null or maximum_stock >= 0),
  reorder_point numeric(18, 3) check (reorder_point is null or reorder_point >= 0),
  unit_cost numeric(18, 4) not null default 0 check (unit_cost >= 0),
  average_cost numeric(18, 4) check (average_cost is null or average_cost >= 0),
  tracks_batches boolean not null default false,
  tracks_expiration boolean not null default false,
  uses_fifo boolean not null default true,
  image_path text,
  location_id uuid references public.inventory_locations(id) on delete set null,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inventory_batches (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.inventory_items(id) on delete cascade,
  batch_code text,
  supplier_id uuid references public.inventory_suppliers(id) on delete set null,
  location_id uuid references public.inventory_locations(id) on delete set null,
  initial_quantity numeric(18, 3) not null check (initial_quantity >= 0),
  current_quantity numeric(18, 3) not null check (current_quantity >= 0),
  unit_cost numeric(18, 4) not null default 0 check (unit_cost >= 0),
  purchase_date date,
  expiration_date date,
  status public.inventory_batch_status not null default 'active',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.inventory_items(id) on delete restrict,
  batch_id uuid references public.inventory_batches(id) on delete set null,
  movement_type public.inventory_movement_type not null,
  quantity numeric(18, 3) not null check (quantity > 0),
  unit_id uuid not null references public.inventory_units(id) on delete restrict,
  unit_cost numeric(18, 4) check (unit_cost is null or unit_cost >= 0),
  total_cost numeric(18, 4) check (total_cost is null or total_cost >= 0),
  from_location_id uuid references public.inventory_locations(id) on delete set null,
  to_location_id uuid references public.inventory_locations(id) on delete set null,
  supplier_id uuid references public.inventory_suppliers(id) on delete set null,
  reason text,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.inventory_counts (
  id uuid primary key default gen_random_uuid(),
  count_type public.inventory_count_type not null,
  title text not null,
  location_id uuid references public.inventory_locations(id) on delete set null,
  category_id uuid references public.inventory_categories(id) on delete set null,
  status public.inventory_count_status not null default 'draft',
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inventory_count_items (
  id uuid primary key default gen_random_uuid(),
  count_id uuid not null references public.inventory_counts(id) on delete cascade,
  item_id uuid not null references public.inventory_items(id) on delete cascade,
  expected_quantity numeric(18, 3) not null default 0,
  counted_quantity numeric(18, 3),
  difference_quantity numeric(18, 3),
  unit_id uuid not null references public.inventory_units(id) on delete restrict,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inventory_count_items_unique unique (count_id, item_id)
);

create table if not exists public.inventory_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_email text,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists inventory_categories_parent_idx on public.inventory_categories(parent_id);
create index if not exists inventory_items_category_idx on public.inventory_items(category_id);
create index if not exists inventory_items_location_idx on public.inventory_items(location_id);
create index if not exists inventory_items_name_idx on public.inventory_items using gin (to_tsvector('spanish', coalesce(name, '') || ' ' || coalesce(sku, '')));
create index if not exists inventory_batches_item_idx on public.inventory_batches(item_id);
create index if not exists inventory_batches_expiration_idx on public.inventory_batches(expiration_date);
create index if not exists inventory_movements_item_idx on public.inventory_movements(item_id);
create index if not exists inventory_movements_created_at_idx on public.inventory_movements(created_at desc);
create index if not exists inventory_counts_created_at_idx on public.inventory_counts(created_at desc);

drop trigger if exists set_inventory_categories_updated_at on public.inventory_categories;
create trigger set_inventory_categories_updated_at before update on public.inventory_categories
for each row execute function public.set_updated_at();

drop trigger if exists set_inventory_units_updated_at on public.inventory_units;
create trigger set_inventory_units_updated_at before update on public.inventory_units
for each row execute function public.set_updated_at();

drop trigger if exists set_inventory_unit_conversions_updated_at on public.inventory_unit_conversions;
create trigger set_inventory_unit_conversions_updated_at before update on public.inventory_unit_conversions
for each row execute function public.set_updated_at();

drop trigger if exists set_inventory_locations_updated_at on public.inventory_locations;
create trigger set_inventory_locations_updated_at before update on public.inventory_locations
for each row execute function public.set_updated_at();

drop trigger if exists set_inventory_suppliers_updated_at on public.inventory_suppliers;
create trigger set_inventory_suppliers_updated_at before update on public.inventory_suppliers
for each row execute function public.set_updated_at();

drop trigger if exists set_inventory_items_updated_at on public.inventory_items;
create trigger set_inventory_items_updated_at before update on public.inventory_items
for each row execute function public.set_updated_at();

drop trigger if exists set_inventory_batches_updated_at on public.inventory_batches;
create trigger set_inventory_batches_updated_at before update on public.inventory_batches
for each row execute function public.set_updated_at();

drop trigger if exists set_inventory_counts_updated_at on public.inventory_counts;
create trigger set_inventory_counts_updated_at before update on public.inventory_counts
for each row execute function public.set_updated_at();

drop trigger if exists set_inventory_count_items_updated_at on public.inventory_count_items;
create trigger set_inventory_count_items_updated_at before update on public.inventory_count_items
for each row execute function public.set_updated_at();

create or replace function public.log_inventory_action(
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
  if not public.is_admin() then
    raise exception 'No autorizado';
  end if;

  select email into actor_email_value from auth.users where id = auth.uid();

  insert into public.inventory_audit_logs (
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

create or replace function public.inventory_apply_movement(
  p_item_id uuid,
  p_movement_type public.inventory_movement_type,
  p_quantity numeric,
  p_unit_id uuid,
  p_batch_id uuid default null,
  p_unit_cost numeric default null,
  p_from_location_id uuid default null,
  p_to_location_id uuid default null,
  p_supplier_id uuid default null,
  p_reason text default null,
  p_notes text default null,
  p_batch_code text default null,
  p_purchase_date date default null,
  p_expiration_date date default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_item public.inventory_items;
  next_stock numeric(18, 3);
  stock_delta numeric(18, 3);
  movement_id uuid;
  target_batch public.inventory_batches;
  final_batch_id uuid := p_batch_id;
  final_unit_cost numeric(18, 4) := coalesce(p_unit_cost, 0);
begin
  if not public.is_admin() then
    raise exception 'No autorizado';
  end if;

  if p_quantity is null or p_quantity <= 0 then
    raise exception 'La cantidad debe ser mayor a 0';
  end if;

  select * into target_item
  from public.inventory_items
  where id = p_item_id
  for update;

  if target_item.id is null then
    raise exception 'Item no encontrado';
  end if;

  if target_item.unit_id <> p_unit_id then
    raise exception 'La unidad del movimiento debe coincidir con la unidad principal del item en esta fase';
  end if;

  stock_delta = case
    when p_movement_type in ('in', 'adjustment_in', 'purchase', 'return') then p_quantity
    when p_movement_type in ('out', 'adjustment_out', 'waste', 'expired', 'internal_use') then -p_quantity
    when p_movement_type = 'transfer' then 0
    when p_movement_type = 'correction' then p_quantity - target_item.current_stock
    else 0
  end;

  next_stock = target_item.current_stock + stock_delta;
  if next_stock < 0 then
    raise exception 'Stock insuficiente. Stock actual: %, salida solicitada: %', target_item.current_stock, p_quantity;
  end if;

  if target_item.tracks_batches and p_movement_type in ('in', 'purchase', 'return', 'adjustment_in') and final_batch_id is null then
    insert into public.inventory_batches (
      item_id,
      batch_code,
      supplier_id,
      location_id,
      initial_quantity,
      current_quantity,
      unit_cost,
      purchase_date,
      expiration_date,
      status,
      notes
    )
    values (
      p_item_id,
      nullif(trim(coalesce(p_batch_code, '')), ''),
      p_supplier_id,
      coalesce(p_to_location_id, target_item.location_id),
      p_quantity,
      p_quantity,
      final_unit_cost,
      p_purchase_date,
      p_expiration_date,
      'active',
      p_notes
    )
    returning id into final_batch_id;
  elsif final_batch_id is not null then
    select * into target_batch from public.inventory_batches where id = final_batch_id for update;
    if target_batch.id is null then
      raise exception 'Lote no encontrado';
    end if;

    if p_movement_type in ('out', 'adjustment_out', 'waste', 'expired', 'internal_use') then
      if target_batch.current_quantity < p_quantity then
        raise exception 'Stock insuficiente en lote';
      end if;

      update public.inventory_batches
      set current_quantity = current_quantity - p_quantity,
          status = case when current_quantity - p_quantity <= 0 then 'depleted'::public.inventory_batch_status else status end
      where id = final_batch_id;
    elsif p_movement_type in ('in', 'purchase', 'return', 'adjustment_in') then
      update public.inventory_batches
      set initial_quantity = initial_quantity + p_quantity,
          current_quantity = current_quantity + p_quantity,
          status = 'active'
      where id = final_batch_id;
    end if;
  end if;

  update public.inventory_items
  set current_stock = next_stock,
      unit_cost = case when final_unit_cost > 0 then final_unit_cost else unit_cost end,
      average_cost = case
        when next_stock > 0 and p_movement_type in ('in', 'purchase', 'return', 'adjustment_in') then
          ((target_item.current_stock * coalesce(target_item.average_cost, target_item.unit_cost, 0)) + (p_quantity * final_unit_cost)) / nullif(next_stock, 0)
        else average_cost
      end
  where id = p_item_id;

  insert into public.inventory_movements (
    item_id,
    batch_id,
    movement_type,
    quantity,
    unit_id,
    unit_cost,
    total_cost,
    from_location_id,
    to_location_id,
    supplier_id,
    reason,
    notes,
    created_by
  )
  values (
    p_item_id,
    final_batch_id,
    p_movement_type,
    p_quantity,
    p_unit_id,
    p_unit_cost,
    case when p_unit_cost is null then null else p_quantity * p_unit_cost end,
    p_from_location_id,
    p_to_location_id,
    p_supplier_id,
    p_reason,
    p_notes,
    auth.uid()
  )
  returning id into movement_id;

  perform public.log_inventory_action(
    'INVENTORY_MOVEMENT',
    'inventory_movement',
    movement_id,
    jsonb_build_object('item_id', p_item_id, 'type', p_movement_type, 'quantity', p_quantity)
  );

  return movement_id;
end;
$$;

create or replace function public.inventory_create_count(
  p_count_type public.inventory_count_type,
  p_title text,
  p_location_id uuid default null,
  p_category_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  count_id uuid;
begin
  if not public.is_admin() then
    raise exception 'No autorizado';
  end if;

  insert into public.inventory_counts (
    count_type,
    title,
    location_id,
    category_id,
    status,
    created_by
  )
  values (
    p_count_type,
    trim(coalesce(nullif(p_title, ''), 'Conteo de inventario')),
    p_location_id,
    p_category_id,
    'in_progress',
    auth.uid()
  )
  returning id into count_id;

  insert into public.inventory_count_items (
    count_id,
    item_id,
    expected_quantity,
    unit_id
  )
  select
    count_id,
    item.id,
    item.current_stock,
    item.unit_id
  from public.inventory_items item
  where item.is_active = true
    and (p_location_id is null or item.location_id = p_location_id)
    and (p_category_id is null or item.category_id = p_category_id);

  perform public.log_inventory_action('INVENTORY_COUNT_CREATED', 'inventory_count', count_id);

  return count_id;
end;
$$;

create or replace function public.inventory_complete_count(
  p_count_id uuid,
  p_apply_adjustments boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  count_item record;
  adjustment_type public.inventory_movement_type;
begin
  if not public.is_admin() then
    raise exception 'No autorizado';
  end if;

  update public.inventory_count_items
  set difference_quantity = coalesce(counted_quantity, expected_quantity) - expected_quantity
  where count_id = p_count_id;

  if p_apply_adjustments then
    for count_item in
      select * from public.inventory_count_items where count_id = p_count_id and coalesce(difference_quantity, 0) <> 0
    loop
      adjustment_type = case when count_item.difference_quantity > 0 then 'adjustment_in' else 'adjustment_out' end;
      perform public.inventory_apply_movement(
        count_item.item_id,
        adjustment_type,
        abs(count_item.difference_quantity),
        count_item.unit_id,
        null,
        null,
        null,
        null,
        null,
        'Ajuste automatico por conteo',
        'Conteo ' || p_count_id::text
      );
    end loop;
  end if;

  update public.inventory_counts
  set status = 'completed',
      completed_at = now()
  where id = p_count_id;

  perform public.log_inventory_action(
    'INVENTORY_COUNT_COMPLETED',
    'inventory_count',
    p_count_id,
    jsonb_build_object('apply_adjustments', p_apply_adjustments)
  );
end;
$$;

alter table public.inventory_categories enable row level security;
alter table public.inventory_units enable row level security;
alter table public.inventory_unit_conversions enable row level security;
alter table public.inventory_locations enable row level security;
alter table public.inventory_suppliers enable row level security;
alter table public.inventory_items enable row level security;
alter table public.inventory_batches enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.inventory_counts enable row level security;
alter table public.inventory_count_items enable row level security;
alter table public.inventory_audit_logs enable row level security;

drop policy if exists "Admins can manage inventory categories" on public.inventory_categories;
create policy "Admins can manage inventory categories" on public.inventory_categories
for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins can manage inventory units" on public.inventory_units;
create policy "Admins can manage inventory units" on public.inventory_units
for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins can manage inventory unit conversions" on public.inventory_unit_conversions;
create policy "Admins can manage inventory unit conversions" on public.inventory_unit_conversions
for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins can manage inventory locations" on public.inventory_locations;
create policy "Admins can manage inventory locations" on public.inventory_locations
for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins can manage inventory suppliers" on public.inventory_suppliers;
create policy "Admins can manage inventory suppliers" on public.inventory_suppliers
for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins can manage inventory items" on public.inventory_items;
create policy "Admins can manage inventory items" on public.inventory_items
for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins can manage inventory batches" on public.inventory_batches;
create policy "Admins can manage inventory batches" on public.inventory_batches
for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins can read inventory movements" on public.inventory_movements;
create policy "Admins can read inventory movements" on public.inventory_movements
for select to authenticated using (public.is_admin());

drop policy if exists "Admins can insert inventory movements" on public.inventory_movements;
create policy "Admins can insert inventory movements" on public.inventory_movements
for insert to authenticated with check (public.is_admin());

drop policy if exists "Admins can manage inventory counts" on public.inventory_counts;
create policy "Admins can manage inventory counts" on public.inventory_counts
for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins can manage inventory count items" on public.inventory_count_items;
create policy "Admins can manage inventory count items" on public.inventory_count_items
for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins can read inventory audit logs" on public.inventory_audit_logs;
create policy "Admins can read inventory audit logs" on public.inventory_audit_logs
for select to authenticated using (public.is_admin());

insert into public.inventory_units (name, abbreviation, unit_type, is_base_unit)
values
  ('Unidad', 'u', 'unit', true),
  ('Pieza', 'pz', 'unit', false),
  ('Caja', 'caja', 'package', false),
  ('Paquete', 'paq', 'package', false),
  ('Bolsa', 'bolsa', 'package', false),
  ('Gramo', 'g', 'weight', true),
  ('Kilogramo', 'kg', 'weight', false),
  ('Mililitro', 'ml', 'volume', true),
  ('Litro', 'l', 'volume', false),
  ('Botella', 'bot', 'package', false),
  ('Lata', 'lata', 'package', false),
  ('Porcion', 'porc', 'other', false),
  ('Docena', 'doc', 'package', false),
  ('Bandeja', 'band', 'package', false)
on conflict (name) do nothing;

insert into public.inventory_categories (name, description, color, icon, sort_order)
values
  ('Carnes', 'Proteinas y carnes para cocina.', '#c84445', 'drumstick-bite', 1),
  ('Lacteos', 'Leche, quesos, crema y derivados.', '#f4dfc5', 'cheese', 2),
  ('Secos', 'Harinas, azucar, cafe, arroz y fideos.', '#d9a629', 'wheat', 3),
  ('Bebidas', 'Gaseosas, cervezas, jugos y cafe listo.', '#5f8742', 'bottle-water', 4),
  ('Frutas', 'Frutas frescas y pulpas.', '#84ba4a', 'apple-whole', 5),
  ('Verduras', 'Verduras y hortalizas.', '#537133', 'carrot', 6),
  ('Salsas', 'Salsas, aderezos y toppings.', '#e8b84a', 'jar', 7),
  ('Empaques', 'Vasos, bolsas, envases y servilletas.', '#58676b', 'box', 8),
  ('Limpieza', 'Insumos de higiene y limpieza.', '#173946', 'spray-can', 9),
  ('Otros', 'Elementos inventariables generales.', '#102125', 'boxes-stacked', 10)
on conflict (name, parent_id) do nothing;

insert into public.inventory_categories (name, parent_id, sort_order)
select child.name, parent.id, child.sort_order
from (
  values
    ('Pollo', 'Carnes', 1),
    ('Res', 'Carnes', 2),
    ('Cerdo', 'Carnes', 3),
    ('Gaseosas', 'Bebidas', 1),
    ('Cervezas', 'Bebidas', 2),
    ('Jugos', 'Bebidas', 3),
    ('Cafe', 'Bebidas', 4),
    ('Leche', 'Lacteos', 1),
    ('Quesos', 'Lacteos', 2),
    ('Vasos', 'Empaques', 1),
    ('Servilletas', 'Empaques', 2),
    ('Envases', 'Empaques', 3)
) as child(name, parent_name, sort_order)
join public.inventory_categories parent on parent.name = child.parent_name and parent.parent_id is null
on conflict (name, parent_id) do nothing;

insert into public.inventory_locations (name, description)
values
  ('Almacen principal', 'Stock general y compras recibidas.'),
  ('Cocina', 'Insumos disponibles para preparacion.'),
  ('Barra', 'Bebidas, cafe y atencion directa.'),
  ('Refrigerador', 'Productos refrigerados.'),
  ('Freezer', 'Productos congelados.'),
  ('Deposito seco', 'Secos, empaques y productos no perecederos.')
on conflict (name) do nothing;

grant execute on function public.log_inventory_action(text, text, uuid, jsonb) to authenticated;
grant execute on function public.inventory_apply_movement(uuid, public.inventory_movement_type, numeric, uuid, uuid, numeric, uuid, uuid, uuid, text, text, text, date, date) to authenticated;
grant execute on function public.inventory_create_count(public.inventory_count_type, text, uuid, uuid) to authenticated;
grant execute on function public.inventory_complete_count(uuid, boolean) to authenticated;

