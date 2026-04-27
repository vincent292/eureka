drop policy if exists "Super admins can delete payment qr history" on public.payment_qr_history;
create policy "Super admins can delete payment qr history"
on public.payment_qr_history
for delete
to authenticated
using (public.is_super_admin());

