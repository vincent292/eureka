set check_function_bodies = off;

create table if not exists public.web_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh_key text not null,
  auth_key text not null,
  user_agent text,
  is_active boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inventory_alert_events (
  id uuid primary key default gen_random_uuid(),
  alert_key text not null unique,
  alert_type text not null check (
    alert_type in (
      'low_stock',
      'out_of_stock',
      'reorder',
      'prepared_low_stock',
      'prepared_out_of_stock',
      'expiring',
      'expired'
    )
  ),
  title text not null,
  message text not null,
  severity text not null check (severity in ('warning', 'danger')),
  item_id uuid references public.inventory_items(id) on delete cascade,
  batch_id uuid references public.inventory_batches(id) on delete cascade,
  metadata jsonb not null default '{}'::jsonb,
  status text not null default 'active' check (status in ('active', 'resolved')),
  first_triggered_at timestamptz not null default now(),
  last_triggered_at timestamptz not null default now(),
  last_sent_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists web_push_subscriptions_user_idx
on public.web_push_subscriptions (user_id, is_active);

create index if not exists inventory_alert_events_status_idx
on public.inventory_alert_events (status, severity, alert_type, last_sent_at);

drop trigger if exists set_web_push_subscriptions_updated_at on public.web_push_subscriptions;
create trigger set_web_push_subscriptions_updated_at
before update on public.web_push_subscriptions
for each row execute function public.set_updated_at();

drop trigger if exists set_inventory_alert_events_updated_at on public.inventory_alert_events;
create trigger set_inventory_alert_events_updated_at
before update on public.inventory_alert_events
for each row execute function public.set_updated_at();

alter table public.web_push_subscriptions enable row level security;
alter table public.inventory_alert_events enable row level security;

drop policy if exists "Users can manage own web push subscriptions" on public.web_push_subscriptions;
create policy "Users can manage own web push subscriptions"
on public.web_push_subscriptions
for all
to authenticated
using (auth.uid() = user_id or public.is_admin())
with check (auth.uid() = user_id or public.is_admin());

drop policy if exists "Admins can read inventory alert events" on public.inventory_alert_events;
create policy "Admins can read inventory alert events"
on public.inventory_alert_events
for select
to authenticated
using (public.is_admin());

drop policy if exists "Admins can manage inventory alert events" on public.inventory_alert_events;
create policy "Admins can manage inventory alert events"
on public.inventory_alert_events
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create or replace function public.upsert_web_push_subscription(
  p_endpoint text,
  p_p256dh_key text,
  p_auth_key text,
  p_user_agent text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  subscription_id uuid;
begin
  if auth.uid() is null then
    raise exception 'No autorizado';
  end if;

  insert into public.web_push_subscriptions (
    user_id,
    endpoint,
    p256dh_key,
    auth_key,
    user_agent,
    is_active,
    last_seen_at
  )
  values (
    auth.uid(),
    trim(p_endpoint),
    trim(p_p256dh_key),
    trim(p_auth_key),
    nullif(trim(coalesce(p_user_agent, '')), ''),
    true,
    now()
  )
  on conflict (endpoint)
  do update
  set user_id = auth.uid(),
      p256dh_key = excluded.p256dh_key,
      auth_key = excluded.auth_key,
      user_agent = excluded.user_agent,
      is_active = true,
      last_seen_at = now()
  returning id into subscription_id;

  return subscription_id;
end;
$$;

create or replace function public.deactivate_web_push_subscription(
  p_endpoint text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'No autorizado';
  end if;

  update public.web_push_subscriptions
  set is_active = false,
      last_seen_at = now()
  where endpoint = trim(p_endpoint)
    and user_id = auth.uid();
end;
$$;

grant execute on function public.upsert_web_push_subscription(text, text, text, text) to authenticated;
grant execute on function public.deactivate_web_push_subscription(text) to authenticated;
