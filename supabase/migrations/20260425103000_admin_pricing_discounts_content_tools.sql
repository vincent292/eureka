drop index if exists public.booking_duration_prices_duration_person_idx;

alter table public.booking_duration_prices
drop constraint if exists booking_duration_prices_duration_minutes_key;

create table if not exists public.discount_tokens (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  label text not null default 'Descuento unico',
  discount_type text not null check (discount_type in ('percent', 'fixed')),
  discount_value numeric not null check (discount_value > 0),
  max_uses integer not null default 1 check (max_uses > 0),
  used_count integer not null default 0 check (used_count >= 0),
  expires_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists discount_tokens_lookup_idx
on public.discount_tokens (upper(code), is_active, expires_at);

drop trigger if exists set_discount_tokens_updated_at on public.discount_tokens;
create trigger set_discount_tokens_updated_at
before update on public.discount_tokens
for each row execute function public.set_updated_at();

alter table public.bookings
add column if not exists booking_price_id uuid references public.booking_duration_prices(id),
add column if not exists discount_token_id uuid references public.discount_tokens(id),
add column if not exists discount_amount numeric not null default 0 check (discount_amount >= 0);

create or replace function public.booking_price_for_rule(p_price_id uuid)
returns numeric
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  configured_price numeric;
begin
  select price
  into configured_price
  from public.booking_duration_prices
  where id = p_price_id
    and is_active = true;

  if configured_price is null then
    raise exception 'No hay un precio activo para esa seleccion';
  end if;

  return configured_price;
end;
$$;

create or replace function public.discount_amount_for_token(
  p_token_id uuid,
  p_base_amount numeric
)
returns numeric
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  token public.discount_tokens;
  calculated_discount numeric;
begin
  if p_token_id is null then
    return 0;
  end if;

  select *
  into token
  from public.discount_tokens
  where id = p_token_id
    and is_active = true
    and used_count < max_uses
    and (expires_at is null or expires_at > now());

  if token.id is null then
    raise exception 'El token de descuento no esta disponible';
  end if;

  if token.discount_type = 'percent' then
    calculated_discount = round(p_base_amount * token.discount_value / 100, 2);
  else
    calculated_discount = token.discount_value;
  end if;

  return least(p_base_amount, calculated_discount);
end;
$$;

create or replace function public.set_booking_derived_fields()
returns trigger
language plpgsql
as $$
declare
  base_amount numeric;
begin
  new.ends_at = new.starts_at + make_interval(mins => new.duration_minutes);

  if new.booking_price_id is not null then
    base_amount = public.booking_price_for_rule(new.booking_price_id);
  else
    base_amount = public.booking_price_for_selection(new.duration_minutes, new.party_size);
  end if;

  new.discount_amount = public.discount_amount_for_token(new.discount_token_id, base_amount);
  new.total_amount = greatest(base_amount - new.discount_amount, 0);

  if new.payment_type = 'deposit_50' then
    new.amount_due = round(new.total_amount * 0.5, 2);
  else
    new.amount_due = new.total_amount;
  end if;

  if new.change_expires_at is null then
    new.change_expires_at = date_trunc('day', new.starts_at at time zone 'America/La_Paz')
      at time zone 'America/La_Paz' + interval '1 day';
  end if;

  return new;
end;
$$;

create or replace function public.create_public_booking(
  p_full_name text,
  p_phone text,
  p_national_id text,
  p_starts_at timestamptz,
  p_duration_minutes integer,
  p_payment_type public.payment_amount_type,
  p_payment_qr_id uuid default null,
  p_party_size integer default 1,
  p_payment_reference text default null,
  p_payment_receipt_path text default null,
  p_pricing_rule_id uuid default null,
  p_discount_code text default null
)
returns table (
  booking_id uuid,
  reservation_code text,
  total_amount numeric,
  discount_amount numeric,
  amount_due numeric,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_booking public.bookings;
  selected_token public.discount_tokens;
  normalized_code text;
begin
  normalized_code = upper(nullif(trim(coalesce(p_discount_code, '')), ''));

  if normalized_code is not null then
    select *
    into selected_token
    from public.discount_tokens
    where upper(code) = normalized_code
      and is_active = true
      and used_count < max_uses
      and (expires_at is null or expires_at > now())
    limit 1;

    if selected_token.id is null then
      raise exception 'El token de descuento no existe o ya fue usado';
    end if;
  end if;

  insert into public.bookings (
    full_name,
    phone,
    national_id,
    starts_at,
    duration_minutes,
    payment_type,
    payment_qr_id,
    party_size,
    payment_reference,
    payment_receipt_path,
    booking_price_id,
    discount_token_id
  )
  values (
    trim(p_full_name),
    trim(p_phone),
    trim(p_national_id),
    p_starts_at,
    p_duration_minutes,
    p_payment_type,
    p_payment_qr_id,
    p_party_size,
    nullif(trim(coalesce(p_payment_reference, '')), ''),
    nullif(trim(coalesce(p_payment_receipt_path, '')), ''),
    p_pricing_rule_id,
    selected_token.id
  )
  returning * into inserted_booking;

  if selected_token.id is not null then
    update public.discount_tokens
    set used_count = used_count + 1
    where id = selected_token.id
      and used_count < max_uses;
  end if;

  return query
  select
    inserted_booking.id,
    inserted_booking.reservation_code,
    inserted_booking.total_amount,
    inserted_booking.discount_amount,
    inserted_booking.amount_due,
    inserted_booking.expires_at;
end;
$$;

alter table public.discount_tokens enable row level security;

drop policy if exists "Admins can manage discount tokens" on public.discount_tokens;
create policy "Admins can manage discount tokens"
on public.discount_tokens
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

grant execute on function public.booking_price_for_rule(uuid) to authenticated, anon;
grant execute on function public.discount_amount_for_token(uuid, numeric) to authenticated, anon;
grant execute on function public.create_public_booking(
  text,
  text,
  text,
  timestamptz,
  integer,
  public.payment_amount_type,
  uuid,
  integer,
  text,
  text,
  uuid,
  text
) to anon, authenticated;
