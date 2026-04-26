alter table public.payment_qrs
add column if not exists expires_at timestamptz;

alter table public.payment_qr_history
add column if not exists expires_at timestamptz;

drop policy if exists "Public can read active payment qrs" on public.payment_qrs;
create policy "Public can read active payment qrs"
on public.payment_qrs
for select
to anon, authenticated
using (is_active = true);

with ranked_qrs as (
  select
    id,
    row_number() over (order by updated_at desc, created_at desc) as position
  from public.payment_qrs
  where is_active = true
)
update public.payment_qrs
set is_active = false,
    updated_at = now()
from ranked_qrs
where public.payment_qrs.id = ranked_qrs.id
  and ranked_qrs.position > 1;

create unique index if not exists payment_qrs_one_active_idx
on public.payment_qrs ((is_active))
where is_active = true;

drop function if exists public.update_payment_qr_protected(uuid, text, text, text, boolean, text);
drop function if exists public.update_payment_qr_protected(uuid, text, text, text, boolean, timestamptz, text);

create or replace function public.update_payment_qr_protected(
  p_payment_qr_id uuid,
  p_label text,
  p_image_path text,
  p_instructions text,
  p_is_active boolean,
  p_expires_at timestamptz,
  p_secret text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_qr public.payment_qrs;
begin
  if not public.is_admin() then
    raise exception 'No autorizado';
  end if;

  if p_secret is distinct from 'Kilian.2026' then
    raise exception 'Clave de proteccion incorrecta.';
  end if;

  if nullif(trim(coalesce(p_image_path, '')), '') is null then
    raise exception 'Sube una imagen QR antes de guardar';
  end if;

  if p_payment_qr_id is not null then
    select *
    into current_qr
    from public.payment_qrs
    where id = p_payment_qr_id
    for update;

    if current_qr.id is null then
      raise exception 'QR no encontrado';
    end if;

    insert into public.payment_qr_history (
      payment_qr_id,
      label,
      image_path,
      instructions,
      expires_at,
      changed_by
    )
    values (
      current_qr.id,
      current_qr.label,
      current_qr.image_path,
      current_qr.instructions,
      current_qr.expires_at,
      auth.uid()
    );

    if p_is_active then
      update public.payment_qrs
      set is_active = false,
          updated_at = now()
      where id <> current_qr.id
        and is_active = true;
    end if;

    update public.payment_qrs
    set label = trim(p_label),
        image_path = trim(p_image_path),
        instructions = nullif(trim(coalesce(p_instructions, '')), ''),
        is_active = p_is_active,
        expires_at = p_expires_at,
        updated_at = now()
    where id = current_qr.id;

    return;
  end if;

  select *
  into current_qr
  from public.payment_qrs
  where is_active = true
  order by updated_at desc
  limit 1
  for update;

  if current_qr.id is not null then
    insert into public.payment_qr_history (
      payment_qr_id,
      label,
      image_path,
      instructions,
      expires_at,
      changed_by
    )
    values (
      current_qr.id,
      current_qr.label,
      current_qr.image_path,
      current_qr.instructions,
      current_qr.expires_at,
      auth.uid()
    );
  end if;

  update public.payment_qrs
  set is_active = false,
      updated_at = now()
  where is_active = true;

  insert into public.payment_qrs (
    label,
    image_path,
    instructions,
    is_active,
    expires_at
  )
  values (
    trim(coalesce(nullif(p_label, ''), 'QR de pago Eureka')),
    trim(p_image_path),
    nullif(trim(coalesce(p_instructions, '')), ''),
    true,
    p_expires_at
  );
end;
$$;

grant execute on function public.update_payment_qr_protected(uuid, text, text, text, boolean, timestamptz, text) to authenticated;
