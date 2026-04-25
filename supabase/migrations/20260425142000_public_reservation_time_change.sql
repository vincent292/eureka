create or replace function public.find_booking_for_change(
  p_reservation_code text
)
returns table (
  booking_id uuid,
  reservation_code text,
  full_name text,
  starts_at timestamptz,
  ends_at timestamptz,
  duration_minutes integer,
  status public.booking_status,
  change_used boolean,
  change_expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  normalized_code text;
begin
  normalized_code = upper(nullif(trim(coalesce(p_reservation_code, '')), ''));

  if normalized_code is null then
    raise exception 'Ingresa tu codigo de reserva';
  end if;

  return query
  select
    booking.id,
    booking.reservation_code,
    booking.full_name,
    booking.starts_at,
    booking.ends_at,
    booking.duration_minutes,
    booking.status,
    booking.change_used,
    booking.change_expires_at
  from public.bookings booking
  where booking.reservation_code = normalized_code
    and booking.status::text in ('pending_payment', 'pendiente_verificacion', 'confirmed')
  limit 1;
end;
$$;

create or replace function public.reschedule_booking_time_once(
  p_reservation_code text,
  p_new_time time
)
returns table (
  booking_id uuid,
  reservation_code text,
  starts_at timestamptz,
  ends_at timestamptz,
  status public.booking_status
)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_booking public.bookings;
  local_date date;
  next_starts_at timestamptz;
begin
  select *
  into target_booking
  from public.bookings booking
  where booking.reservation_code = upper(trim(p_reservation_code))
    and booking.status::text in ('pending_payment', 'pendiente_verificacion', 'confirmed')
  for update;

  if target_booking.id is null then
    raise exception 'Reserva no encontrada';
  end if;

  if target_booking.change_used then
    raise exception 'El cambio de horario ya fue utilizado';
  end if;

  if now() > target_booking.change_expires_at then
    raise exception 'El codigo de cambio ya expiro';
  end if;

  local_date = (target_booking.starts_at at time zone 'America/La_Paz')::date;
  next_starts_at = (local_date::text || ' ' || p_new_time::text)::timestamp
    at time zone 'America/La_Paz';

  update public.bookings
  set starts_at = next_starts_at,
      change_used = true,
      admin_notes = concat_ws(chr(10), nullif(admin_notes, ''), 'Cliente cambio la hora usando su codigo de reserva.'),
      updated_at = now()
  where id = target_booking.id
  returning * into target_booking;

  return query
  select
    target_booking.id,
    target_booking.reservation_code,
    target_booking.starts_at,
    target_booking.ends_at,
    target_booking.status;
end;
$$;

grant execute on function public.find_booking_for_change(text) to anon, authenticated;
grant execute on function public.reschedule_booking_time_once(text, time) to anon, authenticated;
