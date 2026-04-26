drop policy if exists "Admins can read own admin profile" on public.admin_profiles;
create policy "Admins can read own admin profile"
on public.admin_profiles
for select
to authenticated
using (id = auth.uid() and is_active = true);
