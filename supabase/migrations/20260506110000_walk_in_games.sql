set check_function_bodies = off;

create table if not exists public.cash_game_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  default_price numeric(10, 2) not null default 0 check (default_price >= 0),
  default_party_size integer not null default 1 check (default_party_size > 0),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.walk_in_games (
  id uuid primary key default gen_random_uuid(),
  cash_session_id uuid not null references public.cash_sessions(id) on delete restrict,
  game_template_id uuid references public.cash_game_templates(id) on delete set null,
  game_name text not null,
  customer_name text,
  customer_phone text,
  party_size integer not null default 1 check (party_size > 0),
  price numeric(10, 2) not null default 0 check (price >= 0),
  payment_method text check (payment_method in ('cash', 'qr', 'card', 'transfer', 'other')),
  payment_status text not null default 'pending' check (payment_status in ('pending', 'paid', 'cancelled')),
  receipt_image_path text,
  receipt_expires_at timestamptz,
  receipt_deleted_at timestamptz,
  receipt_is_deleted boolean not null default false,
  status text not null default 'pending_payment' check (status in ('pending_payment', 'paid', 'in_game', 'completed', 'cancelled')),
  notes text,
  paid_at timestamptz,
  started_at timestamptz,
  finished_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cash_game_templates_active_idx on public.cash_game_templates (is_active, sort_order);
create index if not exists walk_in_games_session_idx on public.walk_in_games (cash_session_id, created_at desc);
create index if not exists walk_in_games_status_idx on public.walk_in_games (status, payment_status);

drop trigger if exists set_cash_game_templates_updated_at on public.cash_game_templates;
create trigger set_cash_game_templates_updated_at
before update on public.cash_game_templates
for each row execute function public.set_updated_at();

drop trigger if exists set_walk_in_games_updated_at on public.walk_in_games;
create trigger set_walk_in_games_updated_at
before update on public.walk_in_games
for each row execute function public.set_updated_at();

alter table public.cash_game_templates enable row level security;
alter table public.walk_in_games enable row level security;

drop policy if exists "Admins can manage cash game templates" on public.cash_game_templates;
create policy "Admins can manage cash game templates"
on public.cash_game_templates for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can manage walk in games" on public.walk_in_games;
create policy "Admins can manage walk in games"
on public.walk_in_games for all to authenticated
using (public.is_admin())
with check (public.is_admin());

create or replace function public.create_cash_game_template(
  p_name text,
  p_default_price numeric default 0,
  p_default_party_size integer default 1,
  p_sort_order integer default 0
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  base_slug text;
  next_slug text;
  suffix integer := 2;
  template_id uuid;
begin
  perform public.require_cash_admin();

  if nullif(trim(coalesce(p_name, '')), '') is null then
    raise exception 'El nombre del juego es obligatorio.';
  end if;

  base_slug := regexp_replace(lower(trim(p_name)), '[^a-z0-9]+', '-', 'g');
  base_slug := regexp_replace(base_slug, '(^-+|-+$)', '', 'g');
  if base_slug = '' then
    base_slug := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
  end if;

  next_slug := base_slug;
  while exists (select 1 from public.cash_game_templates where slug = next_slug)
  loop
    next_slug := base_slug || '-' || suffix::text;
    suffix := suffix + 1;
  end loop;

  insert into public.cash_game_templates (
    name,
    slug,
    default_price,
    default_party_size,
    sort_order,
    is_active
  )
  values (
    trim(p_name),
    next_slug,
    greatest(coalesce(p_default_price, 0), 0),
    greatest(coalesce(p_default_party_size, 1), 1),
    coalesce(p_sort_order, 0),
    true
  )
  returning id into template_id;

  return template_id;
end;
$$;

create or replace function public.create_walk_in_game(
  p_game_template_id uuid default null,
  p_game_name text default null,
  p_customer_name text default null,
  p_customer_phone text default null,
  p_party_size integer default 1,
  p_price numeric default 0,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  session_row public.cash_sessions;
  template_row public.cash_game_templates;
  next_game_name text;
  next_game_id uuid;
begin
  session_row := public.require_open_cash_session();

  if p_game_template_id is not null then
    select * into template_row
    from public.cash_game_templates
    where id = p_game_template_id
      and is_active = true
    limit 1;
  end if;

  next_game_name := nullif(trim(coalesce(p_game_name, '')), '');
  if next_game_name is null then
    next_game_name := template_row.name;
  end if;

  if next_game_name is null then
    raise exception 'El nombre del juego es obligatorio.';
  end if;

  insert into public.walk_in_games (
    cash_session_id,
    game_template_id,
    game_name,
    customer_name,
    customer_phone,
    party_size,
    price,
    notes,
    created_by,
    created_by_email
  )
  values (
    session_row.id,
    template_row.id,
    next_game_name,
    nullif(trim(coalesce(p_customer_name, '')), ''),
    nullif(trim(coalesce(p_customer_phone, '')), ''),
    greatest(coalesce(p_party_size, template_row.default_party_size, 1), 1),
    greatest(coalesce(p_price, template_row.default_price, 0), 0),
    nullif(trim(coalesce(p_notes, '')), ''),
    auth.uid(),
    public.cash_actor_email()
  )
  returning id into next_game_id;

  perform public.log_cash_action(
    'CREATE_WALK_IN_GAME',
    'walk_in_game',
    next_game_id,
    null,
    jsonb_build_object('gameName', next_game_name),
    null,
    null
  );

  return next_game_id;
end;
$$;

create or replace function public.register_walk_in_game_payment(
  p_game_id uuid,
  p_payment_method text,
  p_receipt_image_path text default null,
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
  game_row public.walk_in_games;
begin
  session_row := public.require_open_cash_session();

  select * into game_row
  from public.walk_in_games
  where id = p_game_id
  for update;

  if game_row.id is null then
    raise exception 'Juego no encontrado.';
  end if;

  if game_row.payment_status = 'paid' then
    raise exception 'Este juego ya tiene un pago registrado.';
  end if;

  if p_payment_method = 'qr' and nullif(trim(coalesce(p_receipt_image_path, '')), '') is null then
    raise exception 'Sube el comprobante QR.';
  end if;

  update public.walk_in_games
  set customer_name = coalesce(nullif(trim(coalesce(p_customer_name, '')), ''), customer_name),
      customer_phone = coalesce(nullif(trim(coalesce(p_customer_phone, '')), ''), customer_phone),
      payment_method = p_payment_method,
      payment_status = 'paid',
      receipt_image_path = nullif(trim(coalesce(p_receipt_image_path, '')), ''),
      receipt_expires_at = case when p_payment_method = 'qr' and nullif(trim(coalesce(p_receipt_image_path, '')), '') is not null then now() + interval '7 days' else null end,
      status = case when status = 'pending_payment' then 'paid' else status end,
      paid_at = now(),
      notes = coalesce(nullif(trim(coalesce(p_notes, '')), ''), notes)
  where id = game_row.id;

  perform public.insert_cash_movement(
    session_row.id,
    'sale',
    'walk_in_game',
    game_row.id,
    'Pago juego ' || game_row.game_name,
    game_row.price,
    p_payment_method,
    'in'
  );

  perform public.log_cash_action(
    'REGISTER_WALK_IN_GAME_PAYMENT',
    'walk_in_game',
    game_row.id,
    to_jsonb(game_row),
    jsonb_build_object('paymentMethod', p_payment_method, 'status', 'paid'),
    null,
    null
  );

  return game_row.id;
end;
$$;

create or replace function public.start_walk_in_game(p_game_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  game_row public.walk_in_games;
begin
  perform public.require_cash_admin();

  select * into game_row
  from public.walk_in_games
  where id = p_game_id
  for update;

  if game_row.id is null then
    raise exception 'Juego no encontrado.';
  end if;

  if game_row.payment_status <> 'paid' then
    raise exception 'Debes registrar el pago antes de iniciar el juego.';
  end if;

  update public.walk_in_games
  set status = 'in_game',
      started_at = coalesce(started_at, now())
  where id = game_row.id;
end;
$$;

create or replace function public.finish_walk_in_game(p_game_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  game_row public.walk_in_games;
begin
  perform public.require_cash_admin();

  select * into game_row
  from public.walk_in_games
  where id = p_game_id
  for update;

  if game_row.id is null then
    raise exception 'Juego no encontrado.';
  end if;

  update public.walk_in_games
  set status = 'completed',
      started_at = coalesce(started_at, now()),
      finished_at = now()
  where id = game_row.id;
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
      union
      select receipt_image_path
      from public.walk_in_games
      where receipt_is_deleted = false
        and receipt_expires_at < now()
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
  ),
  updated_walk_in_games as (
    update public.walk_in_games
    set receipt_is_deleted = true,
        receipt_deleted_at = now()
    where receipt_is_deleted = false
      and receipt_expires_at < now()
    returning id
  )
  select
    coalesce((select count(*) from updated_payments), 0)
    + coalesce((select count(*) from updated_walk_in_games), 0)
  into updated_count;

  return updated_count;
end;
$$;

grant execute on function public.create_cash_game_template(text, numeric, integer, integer) to authenticated;
grant execute on function public.create_walk_in_game(uuid, text, text, text, integer, numeric, text) to authenticated;
grant execute on function public.register_walk_in_game_payment(uuid, text, text, text, text, text) to authenticated;
grant execute on function public.start_walk_in_game(uuid) to authenticated;
grant execute on function public.finish_walk_in_game(uuid) to authenticated;
