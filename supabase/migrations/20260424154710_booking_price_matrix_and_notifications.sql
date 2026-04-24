alter table public.booking_duration_prices
add column if not exists person_count integer not null default 1 check (person_count > 0);

alter table public.booking_duration_prices
drop constraint if exists booking_duration_prices_duration_minutes_key;

create unique index if not exists booking_duration_prices_duration_person_idx
on public.booking_duration_prices (duration_minutes, person_count);

update public.booking_duration_prices
set person_count = 1
where person_count is distinct from 1;

delete from public.booking_duration_prices;

insert into public.booking_duration_prices (
  label,
  duration_minutes,
  person_count,
  price,
  sort_order,
  is_active
)
values
  ('1 hora / 1 persona', 60, 1, 30, 1, true),
  ('1 hora / 2 personas', 60, 2, 50, 2, true),
  ('3 horas / 1 persona', 180, 1, 40, 3, true),
  ('3 horas / 2 personas', 180, 2, 70, 4, true);

create or replace function public.booking_price_for_selection(
  p_duration_minutes integer,
  p_party_size integer
)
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
  where duration_minutes = p_duration_minutes
    and person_count = p_party_size
    and is_active = true;

  if configured_price is null then
    raise exception 'No hay un precio configurado para esa seleccion';
  end if;

  return configured_price;
end;
$$;

create or replace function public.set_booking_derived_fields()
returns trigger
language plpgsql
as $$
begin
  new.ends_at = new.starts_at + make_interval(mins => new.duration_minutes);
  new.total_amount = public.booking_price_for_selection(new.duration_minutes, new.party_size);

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

create or replace view public.public_booking_slots as
select
  starts_at,
  ends_at,
  count(*) filter (
    where status = 'confirmed'
      or (status = 'pending_payment' and expires_at > now())
  ) as used_capacity,
  public.booking_capacity() as max_capacity
from public.bookings
where status in ('pending_payment', 'confirmed')
group by starts_at, ends_at;

create or replace function public.mark_notification_seen(p_notification_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.notification_events
  set status = 'seen'
  where id = p_notification_id;
end;
$$;

grant execute on function public.mark_notification_seen(uuid)
to authenticated;
