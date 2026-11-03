-- Phase 4. Apply ONCE after 202610220001_customer_bookings.sql.
-- No payment confirmation endpoint, fixture payment, or automatic staff promotion.
begin;

alter table public.orders drop constraint orders_payment_status_check;
alter table public.orders add constraint orders_payment_status_check check (payment_status in ('awaiting_payment','paid'));
alter table public.orders drop constraint orders_fulfilment_status_check;
alter table public.orders add constraint orders_fulfilment_status_check check (fulfilment_status in ('not_started','processing','documents_ready','delivered'));
alter table public.orders add constraint unpaid_no_fulfilment check (payment_status='paid' or fulfilment_status='not_started');

create table booking_private.staff_roles (
  user_id uuid primary key references auth.users(id),
  role text not null default 'admin' check (role='admin'),
  granted_at timestamptz not null default now(),
  revoked_at timestamptz
);
alter table booking_private.staff_roles enable row level security;
revoke all on booking_private.staff_roles from public, anon, authenticated;

create function public.is_booking_staff() returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select 1 from booking_private.staff_roles s join auth.users u on u.id=s.user_id
    where s.user_id=auth.uid() and s.revoked_at is null and u.email_confirmed_at is not null and not u.is_anonymous)
$$;
revoke all on function public.is_booking_staff() from public,anon,authenticated;
grant execute on function public.is_booking_staff() to authenticated;

create function booking_private.require_staff() returns void
language plpgsql security definer set search_path='' as $$
begin
  perform booking_private.customer_email();
  perform 1 from booking_private.staff_roles where user_id=auth.uid() and revoked_at is null for share;
  if not found then raise exception using errcode='42501',message='Staff access required'; end if;
end $$;
revoke all on function booking_private.require_staff() from public,anon,authenticated;

create policy staff_orders_read on public.orders for select to authenticated using ((select public.is_booking_staff()));
create policy staff_sectors_read on public.order_sectors for select to authenticated using ((select public.is_booking_staff()));
create policy staff_passengers_read on public.order_passengers for select to authenticated using ((select public.is_booking_staff()));
create policy staff_contacts_read on public.order_contacts for select to authenticated using ((select public.is_booking_staff()));

create table public.order_staff_notes (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id),
  actor_id uuid not null references auth.users(id),
  body text not null check (length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);
alter table public.order_staff_notes enable row level security;
create table public.order_documents (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id),
  version integer not null check(version>0),
  object_name text not null unique,
  size_bytes integer not null check(size_bytes between 1 and 10485760),
  state text not null default 'pending' check(state in ('pending','ready','failed')),
  published_at timestamptz,
  withdrawn_at timestamptz,
  actor_id uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique(order_id,version),
  check(object_name=order_id::text || '/' || id::text || '.pdf'),
  check(published_at is null or state='ready')
);
alter table public.order_documents enable row level security;
create table public.order_audit (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id),
  actor_id uuid not null references auth.users(id),
  event text not null check(event in ('processing','document_uploaded','document_published','document_withdrawn','delivered_email','delivered_whatsapp','note_added','upload_failed')),
  document_id uuid references public.order_documents(id),
  created_at timestamptz not null default now()
);
alter table public.order_audit enable row level security;
create index order_notes_order on public.order_staff_notes(order_id,created_at desc);
create index order_audit_order on public.order_audit(order_id,created_at desc);
create index admin_orders_created on public.orders(created_at desc,id);
create index admin_orders_status on public.orders(payment_status,fulfilment_status);
revoke all on public.order_staff_notes,public.order_documents,public.order_audit from public,anon,authenticated;
grant select on public.order_staff_notes,public.order_documents,public.order_audit to authenticated;
create policy staff_notes_read on public.order_staff_notes for select to authenticated using ((select public.is_booking_staff()));
create policy staff_audit_read on public.order_audit for select to authenticated using ((select public.is_booking_staff()));
create policy staff_documents_read on public.order_documents for select to authenticated using ((select public.is_booking_staff()));
create policy customer_documents_read on public.order_documents for select to authenticated using (
  state='ready' and published_at is not null and withdrawn_at is null and exists (
    select 1 from public.orders o where o.id=order_id and o.owner_id=(select auth.uid()) and o.payment_status='paid'
  )
);

-- Private bucket. Never overwrite an existing bucket/configuration silently.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('order-documents','order-documents',false,10485760,array['application/pdf']);
-- Restrictive policies also block accidental broad permissive policies for this bucket.
-- Storage transport uses a server-only secret, AFTER session + RPC authorization.
create policy order_documents_server_only on storage.objects as restrictive for all to anon,authenticated
  using(bucket_id <> 'order-documents') with check(bucket_id <> 'order-documents');
create policy order_documents_bucket_server_only on storage.buckets as restrictive for all to anon,authenticated
  using(id <> 'order-documents') with check(id <> 'order-documents');

create function public.admin_order_action(p_order_id uuid,p_action text,p_document_id uuid default null,p_note text default null,p_size integer default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare o public.orders; d public.order_documents; result jsonb := '{}'::jsonb; event_name text; new_id uuid;
begin
  perform booking_private.require_staff();
  select * into o from public.orders where id=p_order_id for update;
  if not found then raise exception using errcode='42501',message='Order unavailable'; end if;
  if p_action='note' then
    if p_note is null or length(trim(p_note)) not between 1 and 2000 then raise exception 'Invalid note'; end if;
    insert into public.order_staff_notes(order_id,actor_id,body) values(o.id,auth.uid(),trim(p_note));
    event_name := 'note_added';
  else
    if o.payment_status<>'paid' then raise exception 'Verified payment required'; end if;
    if p_action='start' then
      if o.fulfilment_status<>'not_started' then raise exception 'Status conflict'; end if;
      update public.orders set fulfilment_status='processing',updated_at=now() where id=o.id;
      event_name := 'processing';
    elsif p_action='reserve' then
      if o.fulfilment_status='not_started' or p_size is null or p_size not between 1 and 10485760 then raise exception 'Invalid upload'; end if;
      new_id := gen_random_uuid();
      insert into public.order_documents(id,order_id,version,object_name,size_bytes,actor_id)
        select new_id,o.id,coalesce(max(version),0)+1,o.id::text || '/' || new_id::text || '.pdf',p_size,auth.uid()
        from public.order_documents where order_id=o.id returning * into d;
      return to_jsonb(d);
    else
      select * into d from public.order_documents where id=p_document_id and order_id=o.id for update;
      if not found then raise exception 'Document unavailable'; end if;
      if p_action='complete' then
        if d.state='ready' then return to_jsonb(d); end if;
        if d.state<>'pending' or not exists(select 1 from storage.objects where bucket_id='order-documents' and name=d.object_name
          and metadata->>'mimetype'='application/pdf' and (metadata->>'size')::bigint=d.size_bytes) then raise exception 'Upload incomplete'; end if;
        update public.order_documents set state='ready' where id=d.id;
        update public.orders set fulfilment_status='documents_ready',updated_at=now() where id=o.id;
        event_name := 'document_uploaded';
      elsif p_action='abort' then
        if d.state<>'pending' then raise exception 'Status conflict'; end if;
        update public.order_documents set state='failed' where id=d.id;
        event_name := 'upload_failed';
      elsif p_action='publish' then
        if d.state<>'ready' or d.withdrawn_at is not null then raise exception 'Document unavailable'; end if;
        if d.published_at is not null then return to_jsonb(d); end if;
        update public.order_documents set published_at=now() where id=d.id;
        event_name := 'document_published';
      elsif p_action='withdraw' then
        if d.state<>'ready' then raise exception 'Document unavailable'; end if;
        if d.withdrawn_at is not null then return to_jsonb(d); end if;
        update public.order_documents set withdrawn_at=now() where id=d.id;
        event_name := 'document_withdrawn';
      elsif p_action in ('deliver_email','deliver_whatsapp') then
        if d.state<>'ready' or d.published_at is null or d.withdrawn_at is not null or o.fulfilment_status not in ('documents_ready','delivered') then raise exception 'Publish an available document first'; end if;
        if p_action='deliver_whatsapp' and not exists(select 1 from public.order_contacts where order_id=o.id and regexp_replace(whatsapp,'[\s()-]','','g') ~ '^\+[1-9][0-9]{6,14}$') then raise exception 'Contact unavailable'; end if;
        if exists(select 1 from public.order_audit where order_id=o.id and document_id=d.id and event=replace(p_action,'deliver_','delivered_')) then return to_jsonb(d); end if;
        update public.orders set fulfilment_status='delivered',updated_at=now() where id=o.id;
        event_name := replace(p_action,'deliver_','delivered_');
      else raise exception 'Invalid action';
      end if;
      result := jsonb_build_object('id',d.id);
    end if;
  end if;
  insert into public.order_audit(order_id,actor_id,event,document_id) values(o.id,auth.uid(),event_name,d.id);
  return result;
end $$;
revoke all on function public.admin_order_action(uuid,text,uuid,text,integer) from public,anon,authenticated;
grant execute on function public.admin_order_action(uuid,text,uuid,text,integer) to authenticated;

create function public.authorized_order_document(p_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare d public.order_documents;
begin
  perform booking_private.customer_email();
  select doc.* into d from public.order_documents doc join public.orders o on o.id=doc.order_id
    where doc.id=p_id and doc.state='ready' and o.payment_status='paid' and
    (public.is_booking_staff() or (o.owner_id=auth.uid() and doc.published_at is not null and doc.withdrawn_at is null));
  if not found then raise exception using errcode='42501',message='Document unavailable'; end if;
  return jsonb_build_object('id',d.id,'order_id',d.order_id,'object_name',d.object_name,'version',d.version,'size_bytes',d.size_bytes);
end $$;
revoke all on function public.authorized_order_document(uuid) from public,anon,authenticated;
grant execute on function public.authorized_order_document(uuid) to authenticated;
commit;
