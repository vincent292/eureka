do $$
begin
  if not exists (
    select 1
    from pg_enum
    where enumlabel = 'pendiente_verificacion'
      and enumtypid = 'public.booking_status'::regtype
  ) then
    alter type public.booking_status add value 'pendiente_verificacion';
  end if;
end $$;
