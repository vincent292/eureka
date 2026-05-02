alter table public.booking_duration_prices
add column if not exists person_count integer not null default 1;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'booking_duration_prices_person_count_positive'
  ) then
    alter table public.booking_duration_prices
    add constraint booking_duration_prices_person_count_positive
    check (person_count > 0);
  end if;
end $$;

alter table public.booking_duration_prices
drop constraint if exists booking_duration_prices_duration_minutes_key;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'booking_duration_prices_duration_person_unique'
  ) then
    alter table public.booking_duration_prices
    add constraint booking_duration_prices_duration_person_unique
    unique (duration_minutes, person_count);
  end if;
end $$;


update public.booking_duration_prices
set label = '1 hora / 1 persona',
    price = 30,
    sort_order = 1,
    is_active = true
where duration_minutes = 60
  and person_count = 1;

update public.booking_duration_prices
set label = '1 hora / desde 2 personas',
    price = 25,
    sort_order = 2,
    is_active = true
where duration_minutes = 60
  and person_count = 2;

update public.booking_duration_prices
set label = '3 horas / 1 persona',
    price = 40,
    sort_order = 3,
    is_active = true
where duration_minutes = 180
  and person_count = 1;

update public.booking_duration_prices
set label = '3 horas / desde 2 personas',
    price = 35,
    sort_order = 4,
    is_active = true
where duration_minutes = 180
  and person_count = 2;

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
  ('1 hora / desde 2 personas', 60, 2, 25, 2, true),
  ('3 horas / 1 persona', 180, 1, 40, 3, true),
  ('3 horas / desde 2 personas', 180, 2, 35, 4, true)
on conflict (duration_minutes, person_count) do update
set label = excluded.label,
    price = excluded.price,
    sort_order = excluded.sort_order,
    is_active = excluded.is_active;

create or replace function public.booking_total_for_rule(
  p_price_id uuid,
  p_party_size integer
)
returns numeric
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  selected_rule public.booking_duration_prices;
  group_rule public.booking_duration_prices;
  normalized_party_size integer;
begin
  normalized_party_size = greatest(coalesce(p_party_size, 1), 1);

  select *
  into selected_rule
  from public.booking_duration_prices
  where id = p_price_id
    and is_active = true;

  if selected_rule.id is null then
    raise exception 'No hay un precio activo para esa seleccion';
  end if;

  if normalized_party_size = 1 then
    if selected_rule.person_count = 1 then
      return selected_rule.price;
    end if;

    select *
    into group_rule
    from public.booking_duration_prices
    where duration_minutes = selected_rule.duration_minutes
      and person_count = 1
      and is_active = true
    limit 1;

    return coalesce(group_rule.price, selected_rule.price);
  end if;

  if selected_rule.person_count >= 2 then
    return selected_rule.price * normalized_party_size;
  end if;

  select *
  into group_rule
  from public.booking_duration_prices
  where duration_minutes = selected_rule.duration_minutes
    and person_count = 2
    and is_active = true
  limit 1;

  return coalesce(group_rule.price, selected_rule.price) * normalized_party_size;
end;
$$;

drop function if exists public.validate_discount_code(text, uuid);

create or replace function public.validate_discount_code(
  p_code text,
  p_pricing_rule_id uuid,
  p_party_size integer default 1
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

  base_amount = public.booking_total_for_rule(p_pricing_rule_id, p_party_size);

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
    base_amount = public.booking_total_for_rule(new.booking_price_id, new.party_size);
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

grant execute on function public.booking_total_for_rule(uuid, integer) to anon, authenticated;
grant execute on function public.validate_discount_code(text, uuid, integer) to anon, authenticated;
