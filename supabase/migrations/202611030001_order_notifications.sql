-- Phase 7. Additive only; apply after all three existing migrations.
-- No backfill, payment mutation, automatic email, or change to document access.
begin;

do $$ begin
  if not exists(select 1 from pg_roles where rolname='booking_notification_worker') then
    create role booking_notification_worker nologin nosuperuser nobypassrls;
  elsif exists(select 1 from pg_roles where rolname='booking_notification_worker' and (rolsuper or rolbypassrls or rolcanlogin)) then
    raise exception 'Existing worker role requires review';
  end if;
end $$;

create table public.order_notifications (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id),
  owner_id uuid not null references auth.users(id),
  event text not null check(event in ('booking_saved','processing','document_ready','document_replaced','document_withdrawn')),
  event_key text not null,
  document_id uuid references public.order_documents(id),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  unique(event_key,owner_id)
);
alter table public.order_notifications enable row level security;
revoke all on public.order_notifications from public,anon,authenticated;
grant select on public.order_notifications to authenticated;
create policy notifications_owner_read on public.order_notifications for select to authenticated
  using(owner_id=(select auth.uid()));
create index notifications_owner_date on public.order_notifications(owner_id,created_at desc,id);

create table booking_private.notification_jobs (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null unique references public.order_notifications(id),
  channel text not null default 'email' check(channel='email'),
  status text not null default 'queued' check(status in ('queued','sending','sent','failed','captured','cancelled')),
  attempts integer not null default 0 check(attempts between 0 and 10),
  attempt_limit integer not null default 5 check(attempt_limit between 5 and 10),
  available_at timestamptz not null default now(),
  lease_until timestamptz,
  claim_token uuid,
  error_code text check(error_code in ('transport_unavailable','smtp_rejected','smtp_auth','ambiguous_delivery','recipient_unavailable','superseded')),
  ambiguous boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  accepted_at timestamptz,
  transport text check(transport in ('smtp','capture'))
);
create index notification_jobs_due on booking_private.notification_jobs(available_at,id) where status='queued';
create table booking_private.notification_attempts (
  job_id uuid not null references booking_private.notification_jobs(id),
  attempt integer not null,
  token uuid not null unique,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  outcome text not null default 'sending',
  primary key(job_id,attempt)
);
create table booking_private.notification_retries (
  request_id uuid primary key,
  job_id uuid not null references booking_private.notification_jobs(id),
  actor_id uuid not null references auth.users(id),
  duplicate_risk_acknowledged boolean not null,
  created_at timestamptz not null default now()
);
alter table booking_private.notification_jobs enable row level security;
alter table booking_private.notification_attempts enable row level security;
alter table booking_private.notification_retries enable row level security;
revoke all on booking_private.notification_jobs,booking_private.notification_attempts,booking_private.notification_retries from public,anon,authenticated,booking_notification_worker;

create function booking_private.enqueue_order_notification(p_order uuid,p_event text,p_key text,p_document uuid default null)
returns void language plpgsql security definer set search_path='' as $$
declare o public.orders; notification uuid;
begin
  select * into strict o from public.orders where id=p_order;
  if p_event<>'booking_saved' and o.payment_status<>'paid' then raise exception 'Paid order required'; end if;
  insert into public.order_notifications(order_id,owner_id,event,event_key,document_id)
    values(o.id,o.owner_id,p_event,p_key,p_document)
    on conflict(event_key,owner_id) do nothing returning id into notification;
  if notification is not null then
    insert into booking_private.notification_jobs(notification_id) values(notification);
  end if;
end $$;
revoke all on function booking_private.enqueue_order_notification(uuid,text,text,uuid) from public,anon,authenticated,booking_notification_worker;

create function booking_private.order_notification_trigger() returns trigger
language plpgsql security definer set search_path='' as $$
declare event_name text;
begin
  if tg_table_name='orders' then
    perform booking_private.enqueue_order_notification(new.id,'booking_saved','order:' || new.id);
  elsif new.event in ('processing','document_published','document_withdrawn') then
    event_name := case new.event when 'document_published' then 'document_ready' else new.event end;
    if new.event='document_withdrawn' and not exists(select 1 from public.order_documents where id=new.document_id and published_at is not null) then return new; end if;
    if new.event='document_published' and exists(
      select 1 from public.order_documents old_doc join public.order_documents new_doc on new_doc.id=new.document_id
      where old_doc.order_id=new.order_id and old_doc.id<>new_doc.id and old_doc.kind=new_doc.kind
        and old_doc.published_at is not null and old_doc.withdrawn_at is not null
    ) then event_name := 'document_replaced'; end if;
    perform booking_private.enqueue_order_notification(new.order_id,event_name,'audit:' || new.id,new.document_id);
  end if;
  return new;
end $$;
revoke all on function booking_private.order_notification_trigger() from public,anon,authenticated,booking_notification_worker;
create trigger order_saved_notification after insert on public.orders for each row execute function booking_private.order_notification_trigger();
create trigger order_action_notification after insert on public.order_audit for each row execute function booking_private.order_notification_trigger();

create function public.read_order_notification(p_id uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
  perform booking_private.customer_email();
  update public.order_notifications set read_at=coalesce(read_at,now()) where id=p_id and owner_id=auth.uid();
  if not found then raise exception using errcode='42501',message='Notification unavailable'; end if;
end $$;
revoke all on function public.read_order_notification(uuid) from public,anon,authenticated;
grant execute on function public.read_order_notification(uuid) to authenticated;

-- Narrow log RPC: no recipient addresses, content, notes, provider errors or credentials.
create function public.admin_notification_log(p_page integer default 1,p_failed boolean default false) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
  perform booking_private.require_staff();
  if p_page is null or p_page<1 or p_page>10000 then raise exception 'Invalid page'; end if;
  select coalesce(jsonb_agg(to_jsonb(q)),'[]'::jsonb) into result from (
    select j.id,n.event,o.id order_id,o.reference,j.channel,j.status,j.attempts,j.attempt_limit,
      j.created_at,j.updated_at,j.available_at,j.lease_until,j.accepted_at,j.error_code,j.ambiguous,j.transport,
      (select coalesce(jsonb_agg(jsonb_build_object('attempt',a.attempt,'started_at',a.started_at,'finished_at',a.finished_at,'outcome',a.outcome) order by a.attempt),'[]'::jsonb)
       from booking_private.notification_attempts a where a.job_id=j.id) history
    from booking_private.notification_jobs j join public.order_notifications n on n.id=j.notification_id join public.orders o on o.id=n.order_id
    where not p_failed or j.status='failed'
    order by j.created_at desc,j.id limit 21 offset (p_page-1)*20
  ) q;
  return jsonb_build_object('jobs',result,'failed_count',(select count(*) from booking_private.notification_jobs where status='failed'));
end $$;
revoke all on function public.admin_notification_log(integer,boolean) from public,anon,authenticated;
grant execute on function public.admin_notification_log(integer,boolean) to authenticated;

create function public.retry_order_notification(p_id uuid,p_request uuid,p_acknowledge_duplicate boolean default false) returns void
language plpgsql security definer set search_path='' as $$
declare j booking_private.notification_jobs; prior booking_private.notification_retries;
begin
  perform booking_private.require_staff();
  if p_request is null then raise exception 'Request key required'; end if;
  select * into j from booking_private.notification_jobs where id=p_id for update;
  if not found then raise exception 'Job unavailable'; end if;
  select * into prior from booking_private.notification_retries where request_id=p_request;
  if found then
    if prior.job_id<>p_id or prior.actor_id<>auth.uid() then raise exception 'Request conflict'; end if;
    return;
  end if;
  if j.status<>'failed' or j.attempts>=10 or (j.ambiguous and (not coalesce(p_acknowledge_duplicate,false) or j.updated_at>now()-interval '10 minutes')) then
    raise exception 'Retry unavailable';
  end if;
  insert into booking_private.notification_retries(request_id,job_id,actor_id,duplicate_risk_acknowledged) values(p_request,p_id,auth.uid(),coalesce(p_acknowledge_duplicate,false));
  update booking_private.notification_jobs set status='queued',attempt_limit=least(10,greatest(attempt_limit,attempts+1)),
    available_at=now(),updated_at=now(),error_code=null,ambiguous=false where id=p_id;
end $$;
revoke all on function public.retry_order_notification(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.retry_order_notification(uuid,uuid,boolean) to authenticated;

-- Dedicated worker role can only claim/read/finalize these jobs. No general data access.
create function booking_private.notification_claim(p_mode text,p_recipient text default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare j booking_private.notification_jobs; expired record;
begin
  if p_mode is null or p_mode not in ('capture','controlled','live') or (p_mode='controlled' and coalesce(p_recipient,'')='') then raise exception 'Invalid worker mode'; end if;
  -- Never automatically resend an expired lease: the SMTP result may be unknown.
  for expired in select id,claim_token from booking_private.notification_jobs where status='sending' and lease_until<now() for update skip locked loop
    update booking_private.notification_jobs set status='failed',error_code='ambiguous_delivery',ambiguous=true,updated_at=now() where id=expired.id;
    update booking_private.notification_attempts set finished_at=now(),outcome='ambiguous_delivery' where token=expired.claim_token;
  end loop;
  select jobs.* into j from booking_private.notification_jobs jobs
    join public.order_notifications n on n.id=jobs.notification_id join auth.users u on u.id=n.owner_id
    where jobs.status='queued' and jobs.available_at<=now() and jobs.attempts<jobs.attempt_limit
      and (p_mode='live' or (p_mode='capture' and lower(u.email) like '%@%.test') or (p_mode='controlled' and lower(u.email)=lower(p_recipient)))
    order by jobs.available_at,jobs.id for update of jobs skip locked limit 1;
  if not found then return null; end if;
  update booking_private.notification_jobs set status='sending',attempts=attempts+1,claim_token=gen_random_uuid(),
    lease_until=now()+interval '5 minutes',updated_at=now(),transport=case when p_mode='capture' then 'capture' else 'smtp' end
    where id=j.id returning * into j;
  insert into booking_private.notification_attempts(job_id,attempt,token) values(j.id,j.attempts,j.claim_token);
  return jsonb_build_object('id',j.id,'token',j.claim_token);
end $$;

create function booking_private.notification_payload(p_id uuid,p_token uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare j booking_private.notification_jobs; n public.order_notifications; o public.orders; recipient text; summary jsonb;
begin
  select * into j from booking_private.notification_jobs where id=p_id and claim_token=p_token and status='sending' and lease_until>now();
  if not found then return null; end if;
  select * into strict n from public.order_notifications where id=j.notification_id;
  select * into strict o from public.orders where id=n.order_id;
  select u.email into recipient from auth.users u where u.id=n.owner_id and u.email_confirmed_at is not null and not u.is_anonymous and (u.banned_until is null or u.banned_until<now());
  if recipient is null then return jsonb_build_object('cancel','recipient_unavailable'); end if;
  if (n.event<>'booking_saved' and o.payment_status<>'paid') or (n.event in ('document_ready','document_replaced') and not exists(
    select 1 from public.order_documents where id=n.document_id and state='ready' and published_at is not null and withdrawn_at is null
  )) then return jsonb_build_object('cancel','superseded'); end if;
  select coalesce(jsonb_agg(line order by ordinal),'[]'::jsonb) into summary from (
    select position ordinal,origin || ' to ' || destination || ' on ' || departure::text line from public.order_sectors where order_id=o.id
    union all
    select 10+position,city || ', ' || country || ': ' || check_in::text || ' to ' || check_out::text from public.order_hotels where order_id=o.id
  ) q;
  return jsonb_build_object('id',j.id,'event',n.event,'occurred_at',n.created_at,'order_id',o.id,'reference',o.reference,
    'recipient',recipient,'summary',summary,'amount_minor',o.total_minor,'currency',o.currency,'payment_status',o.payment_status);
end $$;

create function booking_private.notification_finish(p_id uuid,p_token uuid,p_outcome text) returns boolean
language plpgsql security definer set search_path='' as $$
declare j booking_private.notification_jobs; next_status text;
begin
  if p_outcome is null or p_outcome not in ('accepted','captured','transport_unavailable','smtp_rejected','smtp_auth','ambiguous_delivery','recipient_unavailable','superseded') then raise exception 'Invalid outcome'; end if;
  select * into j from booking_private.notification_jobs where id=p_id and claim_token=p_token and status='sending' and lease_until>now() for update;
  if not found then return false; end if;
  if (p_outcome='accepted' and j.transport<>'smtp') or (p_outcome='captured' and j.transport<>'capture') then raise exception 'Transport mismatch'; end if;
  next_status := case when p_outcome='accepted' then 'sent' when p_outcome='captured' then 'captured'
    when p_outcome in ('recipient_unavailable','superseded') then 'cancelled'
    when p_outcome='transport_unavailable' and j.attempts<j.attempt_limit then 'queued' else 'failed' end;
  update booking_private.notification_jobs set status=next_status,updated_at=now(),lease_until=null,
    available_at=now()+make_interval(secs=>least(3600,30*power(2,j.attempts-1)::integer)),
    accepted_at=case when p_outcome='accepted' then now() else null end,
    ambiguous=p_outcome='ambiguous_delivery',error_code=case when p_outcome in ('accepted','captured') then null else p_outcome end where id=p_id;
  update booking_private.notification_attempts set finished_at=now(),outcome=p_outcome where token=p_token;
  return true;
end $$;
revoke all on function booking_private.notification_claim(text,text),booking_private.notification_payload(uuid,uuid),booking_private.notification_finish(uuid,uuid,text) from public,anon,authenticated,booking_notification_worker;
grant usage on schema booking_private to booking_notification_worker;
grant execute on function booking_private.notification_claim(text,text),booking_private.notification_payload(uuid,uuid),booking_private.notification_finish(uuid,uuid,text) to booking_notification_worker;
commit;
