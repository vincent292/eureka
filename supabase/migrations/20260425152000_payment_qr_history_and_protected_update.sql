create table if not exists public.payment_qr_history (
  id uuid primary key default gen_random_uuid(),
  payment_qr_id uuid references public.payment_qrs(id) on delete set null,
  label text not null,
  image_path text not null,
  instructions text,
  changed_at timestamptz not null default now(),
  changed_by uuid references auth.users(id) on delete set null
);

alter table public.payment_qr_history enable row level security;

drop policy if exists "Admins can read payment qr history" on public.payment_qr_history;
create policy "Admins can read payment qr history"
on public.payment_qr_history
for select
to authenticated
using (public.is_admin());

create or replace function public.update_payment_qr_protected(
  p_payment_qr_id uuid,
  p_label text,
  p_image_path text,
  p_instructions text,
  p_is_active boolean,
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
    raise exception 'Clave incorrecta para cambiar el QR';
  end if;

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
    changed_by
  )
  values (
    current_qr.id,
    current_qr.label,
    current_qr.image_path,
    current_qr.instructions,
    auth.uid()
  );

  update public.payment_qrs
  set label = trim(p_label),
      image_path = trim(p_image_path),
      instructions = nullif(trim(coalesce(p_instructions, '')), ''),
      is_active = p_is_active,
      updated_at = now()
  where id = current_qr.id;
end;
$$;

grant execute on function public.update_payment_qr_protected(uuid, text, text, text, boolean, text) to authenticated;
