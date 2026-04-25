drop policy if exists "Public can upload payment proofs" on storage.objects;
create policy "Public can upload payment proofs"
on storage.objects
for insert
to anon, authenticated
with check (
  bucket_id = 'payments'
  and name like 'payment-proofs/%'
);

create or replace function public.cleanup_old_payment_proofs()
returns integer
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  deleted_count integer := 0;
begin
  with old_bookings as (
    select id, payment_receipt_path
    from public.bookings
    where payment_receipt_path is not null
      and proof_deleted_at is null
      and created_at < now() - interval '7 days'
      and payment_receipt_path like 'payment-proofs/%'
  ),
  deleted_objects as (
    delete from storage.objects object
    using old_bookings booking
    where object.bucket_id = 'payments'
      and object.name = booking.payment_receipt_path
    returning object.name
  ),
  updated_bookings as (
    update public.bookings booking
    set proof_deleted_at = now()
    from old_bookings old_booking
    where booking.id = old_booking.id
    returning booking.id
  )
  select count(*) into deleted_count from updated_bookings;

  return deleted_count;
end;
$$;

grant execute on function public.cleanup_old_payment_proofs() to authenticated;

create extension if not exists pg_cron with schema extensions;

do $$
begin
  perform cron.unschedule('cleanup_old_payment_proofs_daily');
exception
  when others then
    null;
end $$;

select cron.schedule(
  'cleanup_old_payment_proofs_daily',
  '0 3 * * *',
  'select public.cleanup_old_payment_proofs();'
);
