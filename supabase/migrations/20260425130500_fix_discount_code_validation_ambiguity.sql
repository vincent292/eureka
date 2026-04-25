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
  calculated_discount numeric;
begin
  if nullif(trim(coalesce(p_code, '')), '') is null then
    raise exception 'Ingresa un codigo de descuento';
  end if;

  base_amount = public.booking_price_for_rule(p_pricing_rule_id);

  select token.*
  into selected_token
  from public.discount_tokens token
  where upper(token.code) = upper(trim(p_code))
    and token.is_active = true
    and token.used_count < token.max_uses
    and (token.expires_at is null or token.expires_at > now())
  limit 1;

  if selected_token.id is null then
    raise exception 'El codigo no existe, ya fue usado o esta vencido';
  end if;

  calculated_discount = public.discount_amount_for_token(selected_token.id, base_amount);

  return query
  select
    selected_token.code,
    base_amount,
    calculated_discount,
    greatest(base_amount - calculated_discount, 0),
    'Codigo aplicado correctamente'::text;
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
    select token.*
    into selected_token
    from public.discount_tokens token
    where upper(token.code) = normalized_code
      and token.is_active = true
      and token.used_count < token.max_uses
      and (token.expires_at is null or token.expires_at > now())
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
    update public.discount_tokens token
    set used_count = token.used_count + 1
    where token.id = selected_token.id
      and token.used_count < token.max_uses;
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
