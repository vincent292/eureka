alter table public.bookings
add column if not exists payment_receipt_original_name text,
add column if not exists payment_receipt_mime_type text,
add column if not exists payment_receipt_size integer,
add column if not exists proof_deleted_at timestamptz,
add column if not exists rejection_reason text;

create table if not exists public.message_templates (
  id uuid primary key default gen_random_uuid(),
  type text not null unique check (type in ('accepted', 'rejected')),
  content text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_message_templates_updated_at on public.message_templates;
create trigger set_message_templates_updated_at
before update on public.message_templates
for each row execute function public.set_updated_at();

insert into public.message_templates (type, content, active)
values
  (
    'accepted',
    'Hola {nombre}, tu reserva en Reservas Eureka fue aceptada.' || chr(10) || chr(10) ||
    'Fecha: {fecha}' || chr(10) ||
    'Hora: {hora}' || chr(10) ||
    'Paquete: {paquete}' || chr(10) ||
    'Total pagado: Bs {total}' || chr(10) || chr(10) ||
    'Te recomendamos llegar 10 minutos antes. Te esperamos!',
    true
  ),
  (
    'rejected',
    'Hola {nombre}, tu reserva en Reservas Eureka fue rechazada.' || chr(10) || chr(10) ||
    'Motivo: {motivo}' || chr(10) || chr(10) ||
    'Por favor comunicate con nosotros para revisar tu pago o realizar una nueva reserva.',
    true
  )
on conflict (type) do nothing;

create or replace function public.validate_discount_code(
  p_code text,
  p_pricing_rule_id uuid
)
returns table (
  code text,
  subtotal numeric,
  discount_amount numeric,
  total numeric,
  message text
)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  selected_token public.discount_tokens;
  base_amount numeric;
begin
  if nullif(trim(coalesce(p_code, '')), '') is null then
    raise exception 'Ingresa un codigo de descuento';
  end if;

  base_amount = public.booking_price_for_rule(p_pricing_rule_id);

  select *
  into selected_token
  from public.discount_tokens
  where upper(code) = upper(trim(p_code))
    and is_active = true
    and used_count < max_uses
    and (expires_at is null or expires_at > now())
  limit 1;

  if selected_token.id is null then
    raise exception 'El codigo no existe, ya fue usado o esta vencido';
  end if;

  code = selected_token.code;
  subtotal = base_amount;
  discount_amount = public.discount_amount_for_token(selected_token.id, base_amount);
  total = greatest(base_amount - discount_amount, 0);
  message = 'Codigo aplicado correctamente';

  return next;
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
  new.amount_due = new.total_amount;

  if new.change_expires_at is null then
    new.change_expires_at = date_trunc('day', new.starts_at at time zone 'America/La_Paz')
      at time zone 'America/La_Paz' + interval '1 day';
  end if;

  return new;
end;
$$;

create or replace function public.ensure_booking_slot_available()
returns trigger
language plpgsql
as $$
declare
  overlapping_count integer;
  max_capacity integer;
  slot_weekday integer;
  slot_time time;
  slot_end_time time;
begin
  new.ends_at = new.starts_at + make_interval(mins => new.duration_minutes);

  if new.status::text not in ('pending_payment', 'pendiente_verificacion', 'confirmed') then
    return new;
  end if;

  slot_weekday = extract(dow from new.starts_at at time zone 'America/La_Paz');
  slot_time = (new.starts_at at time zone 'America/La_Paz')::time;
  slot_end_time = (new.ends_at at time zone 'America/La_Paz')::time;

  if not exists (
    select 1
    from public.booking_availability_rules rule
    where rule.weekday = slot_weekday
      and rule.is_open = true
      and slot_time >= rule.opens_at
      and slot_end_time <= rule.closes_at
  ) then
    raise exception 'Horario fuera de atencion';
  end if;

  if exists (
    select 1
    from public.booking_blackouts blackout
    where tstzrange(blackout.starts_at, blackout.ends_at, '[)')
      && tstzrange(new.starts_at, new.ends_at, '[)')
  ) then
    raise exception 'Horario bloqueado por administracion';
  end if;

  select public.booking_capacity() into max_capacity;

  select count(*)
  into overlapping_count
  from public.bookings booking
  where booking.id is distinct from new.id
    and booking.status::text in ('pending_payment', 'pendiente_verificacion', 'confirmed')
    and (
      booking.expires_at > now()
      or booking.status::text in ('pendiente_verificacion', 'confirmed')
    )
    and tstzrange(booking.starts_at, booking.ends_at, '[)')
      && tstzrange(new.starts_at, new.ends_at, '[)');

  if overlapping_count >= max_capacity then
    raise exception 'Ya no hay cupos disponibles para ese horario';
  end if;

  return new;
end;
$$;

create or replace view public.public_booking_slots as
select
  starts_at,
  ends_at,
  count(*) filter (
    where status::text = 'confirmed'
      or status::text = 'pendiente_verificacion'
      or (status::text = 'pending_payment' and expires_at > now())
  ) as used_capacity,
  public.booking_capacity() as max_capacity
from public.bookings
where status::text in ('pending_payment', 'pendiente_verificacion', 'confirmed')
group by starts_at, ends_at;

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
  p_discount_code text default null,
  p_payment_receipt_original_name text default null,
  p_payment_receipt_mime_type text default null,
  p_payment_receipt_size integer default null
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
    for update
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
    status,
    payment_type,
    payment_qr_id,
    party_size,
    payment_reference,
    payment_receipt_path,
    payment_receipt_original_name,
    payment_receipt_mime_type,
    payment_receipt_size,
    booking_price_id,
    discount_token_id
  )
  values (
    trim(p_full_name),
    trim(p_phone),
    trim(p_national_id),
    p_starts_at,
    p_duration_minutes,
    'pendiente_verificacion'::public.booking_status,
    p_payment_type,
    p_payment_qr_id,
    p_party_size,
    nullif(trim(coalesce(p_payment_reference, '')), ''),
    nullif(trim(coalesce(p_payment_receipt_path, '')), ''),
    nullif(trim(coalesce(p_payment_receipt_original_name, '')), ''),
    nullif(trim(coalesce(p_payment_receipt_mime_type, '')), ''),
    p_payment_receipt_size,
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

alter table public.message_templates enable row level security;

drop policy if exists "Admins can manage message templates" on public.message_templates;
create policy "Admins can manage message templates"
on public.message_templates
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Public can validate discount codes" on public.discount_tokens;
create policy "Public can validate discount codes"
on public.discount_tokens
for select
to anon
using (is_active = true);

grant execute on function public.validate_discount_code(text, uuid) to anon, authenticated;
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
  text,
  text,
  text,
  integer
) to anon, authenticated;
