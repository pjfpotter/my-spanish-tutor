-- Refusals (cap reached, rate limited) and failures are logged beside successful calls.
alter table cost_log
  add column outcome text not null default 'ok'
  check (outcome in ('ok', 'cap_reached', 'rate_limited', 'error'));
