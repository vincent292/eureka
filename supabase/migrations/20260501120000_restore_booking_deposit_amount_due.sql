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
