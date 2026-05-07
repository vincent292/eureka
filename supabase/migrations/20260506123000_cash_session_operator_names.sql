set check_function_bodies = off;

alter table public.cash_sessions
  add column if not exists opening_operator_name text,
  add column if not exists opening_balance_reason text,
  add column if not exists closing_operator_name text;

alter table public.cash_closure_reports
  add column if not exists opening_operator_name text,
  add column if not exists closing_operator_name text;

alter table public.cash_sessions
  drop constraint if exists cash_sessions_opening_cash_amount_check;

alter table public.cash_sessions
  add constraint cash_sessions_opening_cash_amount_check
  check (opening_cash_amount between -999999.99 and 999999.99);

create or replace function public.open_cash_session(
  p_opening_cash_amount numeric,
  p_notes text default null,
  p_opening_operator_name text default null,
  p_opening_balance_reason text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_session public.cash_sessions;
  next_operator_name text;
begin
  perform public.require_cash_admin();

  if exists (
    select 1
    from public.cash_sessions
    where session_date = (now() at time zone 'America/La_Paz')::date
      and status = 'open'
  ) then
    raise exception 'Ya existe una caja abierta para hoy.';
  end if;

  next_operator_name := nullif(trim(coalesce(p_opening_operator_name, '')), '');

  if coalesce(p_opening_cash_amount, 0) < 0 and nullif(trim(coalesce(p_opening_balance_reason, '')), '') is null then
    raise exception 'Explica por que la apertura tiene saldo negativo.';
  end if;

  insert into public.cash_sessions (
    opened_by,
    opened_by_email,
    opening_operator_name,
    opening_cash_amount,
    opening_balance_reason,
    notes
  )
  values (
    auth.uid(),
    public.cash_actor_email(),
    coalesce(next_operator_name, public.cash_actor_email()),
    coalesce(p_opening_cash_amount, 0),
    nullif(trim(coalesce(p_opening_balance_reason, '')), ''),
    nullif(trim(coalesce(p_notes, '')), '')
  )
  returning * into inserted_session;

  perform public.log_cash_action(
    'OPEN_CASH_SESSION',
    'cash_session',
    inserted_session.id,
    null,
    jsonb_build_object(
      'openingCashAmount', inserted_session.opening_cash_amount,
      'openingOperatorName', inserted_session.opening_operator_name,
      'openingBalanceReason', inserted_session.opening_balance_reason
    ),
    null,
    null
  );

  return inserted_session.id;
end;
$$;

create or replace function public.close_cash_session(
  p_counted_cash_amount numeric,
  p_closing_notes text default null,
  p_closing_operator_name text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  session_row public.cash_sessions;
  summary jsonb;
  inserted_report public.cash_closure_reports;
begin
  perform public.require_cash_admin();
  session_row = public.require_open_cash_session();
  summary = public.cash_summary_for_session(session_row.id);

  update public.cash_sessions
  set status = 'closed',
      closed_by = auth.uid(),
      closed_by_email = public.cash_actor_email(),
      closed_at = now(),
      closing_cash_counted = coalesce(p_counted_cash_amount, 0),
      expected_cash_amount = coalesce((summary->>'expectedCashAmount')::numeric, 0),
      difference_amount = coalesce(p_counted_cash_amount, 0) - coalesce((summary->>'expectedCashAmount')::numeric, 0),
      closing_operator_name = coalesce(nullif(trim(coalesce(p_closing_operator_name, '')), ''), public.cash_actor_email()),
      closing_notes = nullif(trim(coalesce(p_closing_notes, '')), '')
  where id = session_row.id
  returning * into session_row;

  insert into public.cash_closure_reports (
    cash_session_id,
    report_date,
    opening_cash_amount,
    total_cash_income,
    total_qr_income,
    total_card_income,
    total_transfer_income,
    total_expenses,
    total_reservation_payments,
    total_table_order_payments,
    total_pos_sales,
    total_manual_income,
    expected_cash_amount,
    counted_cash_amount,
    difference_amount,
    opening_operator_name,
    closing_operator_name,
    closed_by,
    closed_by_email,
    closed_at,
    report_snapshot
  )
  values (
    session_row.id,
    session_row.session_date,
    session_row.opening_cash_amount,
    coalesce((summary->>'totalCashIncome')::numeric, 0),
    coalesce((summary->>'totalQrIncome')::numeric, 0),
    coalesce((summary->>'totalCardIncome')::numeric, 0),
    coalesce((summary->>'totalTransferIncome')::numeric, 0),
    coalesce((summary->>'totalExpenses')::numeric, 0),
    coalesce((summary->>'totalReservationPayments')::numeric, 0),
    coalesce((summary->>'totalTableOrderPayments')::numeric, 0),
    coalesce((summary->>'totalPosSales')::numeric, 0),
    coalesce((summary->>'totalManualIncome')::numeric, 0),
    session_row.expected_cash_amount,
    session_row.closing_cash_counted,
    session_row.difference_amount,
    session_row.opening_operator_name,
    session_row.closing_operator_name,
    session_row.closed_by,
    session_row.closed_by_email,
    session_row.closed_at,
    summary || jsonb_build_object(
      'closingNotes', session_row.closing_notes,
      'openingOperatorName', session_row.opening_operator_name,
      'closingOperatorName', session_row.closing_operator_name,
      'openingBalanceReason', session_row.opening_balance_reason
    )
  )
  returning * into inserted_report;

  perform public.log_cash_action('CLOSE_CASH_SESSION', 'cash_session', session_row.id, null, to_jsonb(inserted_report), null, null);
  return inserted_report.id;
end;
$$;

grant execute on function public.open_cash_session(numeric, text, text, text) to authenticated;
grant execute on function public.close_cash_session(numeric, text, text) to authenticated;
