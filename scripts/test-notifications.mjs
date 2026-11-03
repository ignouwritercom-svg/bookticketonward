// Isolated PostgreSQL and local MIME capture only. Never reads .env or uses SMTP/hosted Supabase.
import { PGlite } from '@electric-sql/pglite';
import { readFile, mkdir, writeFile, readdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import { renderNotification } from './notifications/templates.mjs';
import { createTransport, transportConfig, safeFailure } from './notifications/transport.mjs';
import { processOne } from './notifications/runner.mjs';

const directory = `test-results/notifications-${randomUUID()}`;
await mkdir(directory, { recursive: true });
const results = [];
const check = (value, label) => { assert.ok(value, label); results.push({ label, passed: true }); };
const deny = async (fn, label) => { await assert.rejects(fn, undefined, label); results.push({ label, passed: true }); };
const db = await PGlite.create();
const owner = randomUUID(), other = randomUUID(), staff = randomUUID();
const query = async (sql, params = []) => (await db.query(sql, params)).rows;
const root = () => db.exec('reset role');
async function identity(id) { await root(); await query("select set_config('request.jwt.claim.sub',$1,false)", [id ?? '']); await db.exec(`set role ${id ? 'authenticated' : 'anon'}`); }
async function worker() { await root(); await db.exec('set role booking_notification_worker'); }
const action = async (id, action, document = null, size = null) => (await query('select public.admin_order_action($1,$2,$3,null,$4,\'flight\') result', [id, action, document, size]))[0].result;
const claim = async () => (await query("select booking_private.notification_claim('capture',null) result"))[0].result;
const payload = async job => (await query('select booking_private.notification_payload($1,$2) result', [job.id,job.token]))[0].result;
const finish = async (job,outcome) => (await query('select booking_private.notification_finish($1,$2,$3) result', [job.id,job.token,outcome]))[0].result;
const captureConfig = transportConfig({});
const capture = createTransport(captureConfig, `${directory}/mail`);
let failed = false;
try {
  await db.exec(`create role anon; create role authenticated; create role migration_owner nosuperuser nobypassrls; create role booking_notification_worker nologin;
    create schema auth; create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,is_anonymous boolean default false,banned_until timestamptz);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to anon,authenticated,migration_owner; grant select,references on auth.users to migration_owner;
    grant create,usage on schema public to migration_owner;
    create schema storage authorization migration_owner;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,metadata jsonb);
    alter table storage.buckets owner to migration_owner; alter table storage.objects owner to migration_owner;
    alter table storage.buckets enable row level security; alter table storage.objects enable row level security;
    grant usage on schema storage to anon,authenticated;
    alter default privileges for role migration_owner grant all on tables to public,anon,authenticated;
    alter default privileges for role migration_owner grant execute on functions to public,anon,authenticated;`);
  await db.exec((await query("select format('grant create on database %I to migration_owner',current_database()) sql"))[0].sql);
  await db.exec('set role migration_owner');
  for (const name of ['202610220001_customer_bookings.sql','202610220002_admin_documents.sql','202611020001_hotel_reservations.sql','202611030001_order_notifications.sql']) await db.exec(await readFile(`supabase/migrations/${name}`,'utf8'));
  check(true, 'All four actual migrations apply under a non-superuser owner with hostile default grants');
  await root();
  for (const [id,email] of [[owner,'owner@example.test'],[other,'other@example.test'],[staff,'staff@example.test']]) await query('insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())',[id,email]);
  await query('insert into booking_private.staff_roles(user_id) values($1)',[staff]);
  const catalog = (await query('select * from booking_private.catalog'))[0];
  const booking = email => ({trip:{type:'return',sectors:[{from:'Delhi <img src=x onerror=alert(1)>',to:'Dubai & Coast',departure:'2099-06-15'}],returnDate:'2099-06-20'},passengers:[{givenNames:'Sensitive Passenger',surname:'Never Email',singleName:false,dob:'1990-01-01',sex:'F',nationality:''}],communication:{accountEmail:email,channel:'whatsapp',whatsapp:'+919876543210',alternateContact:'',purpose:'',appointmentDate:'',specialInstructions:'Private sensitive instructions'},confirmations:{detailsCorrect:true,termsAccepted:true}});
  async function create(id,email) {
    await identity(id); const draft=randomUUID(), key=randomUUID();
    await query('select public.save_booking_draft($1,0,$2::jsonb)',[draft,JSON.stringify(booking(email))]);
    const args=[draft,1,key,69900,catalog.policy_version,catalog.policy_text];
    const sql='select public.create_booking_order($1,$2,$3,$4,$5,$6) id';
    const order=(await query(sql,args))[0].id;
    check((await query(sql,args))[0].id===order,'Order creation retry preserves the same order');
    return order;
  }
  const paid=await create(owner,'owner@example.test'), unpaid=await create(other,'other@example.test');
  await root();
  check((await query('select count(*)::int count from booking_private.notification_jobs'))[0].count===2,'Exactly one durable job per saved order, no migration backfill');
  await query("select booking_private.enqueue_order_notification($1,'booking_saved',$2)",[paid,`order:${paid}`]);
  check((await query('select count(*)::int count from booking_private.notification_jobs'))[0].count===2,'Duplicate event recipient is idempotent');
  const ownerNotice=(await query('select id from public.order_notifications where owner_id=$1',[owner]))[0].id;
  for (const id of [null,owner,other]) {
    await identity(id);
    await deny(()=>query("select booking_private.notification_claim('live',null)"),'Anonymous/customer cannot claim or send jobs');
    await deny(()=>query('select * from booking_private.notification_jobs'),'Outbox contents are private');
    await deny(()=>query('select public.admin_notification_log()'),'Anonymous/customer cannot read staff log');
    await deny(()=>query("select public.retry_order_notification($1,$2,false)",[randomUUID(),randomUUID()]),'Anonymous/customer cannot retry emails');
    if(id) {
      check((await query('select * from public.order_notifications')).every(row=>row.owner_id===id),'Customer activity RLS isolates owners');
      await deny(()=>query("insert into public.order_notifications(order_id,owner_id,event,event_key) values($1,$2,'booking_saved','forged')",[paid,id]),'Customer cannot enqueue arbitrary notifications');
    }
  }
  await identity(other); await deny(()=>query('select public.read_order_notification($1)',[ownerNotice]),'Other owner cannot mark activity read');
  await identity(owner); await query('select public.read_order_notification($1)',[ownerNotice]);
  check(!!(await query('select read_at from public.order_notifications where id=$1',[ownerNotice]))[0].read_at,'Owner can mark own activity read');
  await identity(staff); await deny(()=>action(unpaid,'start'),'Unpaid processing and its event are denied');
  await deny(()=>action(unpaid,'publish',randomUUID()),'Unpaid publication and its event are denied');
  await root();
  check((await query("select count(*)::int count from public.order_notifications where event<>'booking_saved'"))[0].count===0,'No fulfilment messages for unpaid orders');
  check((await query("select count(*)::int count from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relname in ('order_notifications','notification_jobs','notification_attempts','notification_retries') and c.relrowsecurity"))[0].count===4,'All notification tables explicitly enable RLS');
  await worker();
  const [one,two]=await Promise.all([claim(),claim()]);
  check(one.id!==two.id,'Competing workers claim distinct jobs (serialized embedded SQL sessions)');
  check(await claim()===null,'Already leased jobs cannot be claimed again');
  const mail=await payload(one);
  check(mail.payment_status==='awaiting_payment' && mail.amount_minor===69900 && mail.summary.length===2,'Unpaid event has exact amount, route and return-date summary');
  const rendered=renderNotification(mail,captureConfig.origin);
  check(rendered.text.includes('Awaiting payment') && rendered.text.includes('timer have not started'),'Saved-order email is honest about payment and timing');
  check(!rendered.html.includes('<img') && rendered.html.includes('&lt;img') && rendered.html.includes('&amp;'),'Customer route text is HTML escaped');
  check(!JSON.stringify(rendered).includes('Sensitive Passenger') && !JSON.stringify(rendered).includes('1990-01-01') && !JSON.stringify(rendered).includes('Private sensitive'),'No passengers, DOB or instructions in email');
  check(!rendered.text.includes('/api/documents') && !rendered.text.includes('token='),'Only authenticated order links, no private downloads or tokens');
  check(!await finish({...one,token:randomUUID()},'captured'),'Completion requires current claim token');
  check(await capture.send(mail,rendered,one.token)==='captured','Local MIME capture writes email without SMTP');
  check(await finish(one,'captured'),'Capture has distinct non-sent state');
  check(!await finish(one,'captured'),'Duplicate completion is fenced');
  await finish(two,'transport_unavailable');
  check(await claim()===null,'Retry backoff prevents immediate reclaim');
  await root(); check((await query('select count(*)::int count from public.orders'))[0].count===2,'Transport failure preserves saved orders');
  for (let i=2;i<=5;i++) {
    await query("update booking_private.notification_jobs set available_at=now()-interval '1 second' where id=$1",[two.id]);
    await worker(); const job=await claim(); check(!!job,'Due transient retry can be claimed'); await finish(job,'transport_unavailable'); await root();
  }
  check((await query('select status,attempts from booking_private.notification_jobs where id=$1',[two.id]))[0].status==='failed','Automatic retries stop after five attempts');
  await identity(staff); const retry=randomUUID();
  await query('select public.retry_order_notification($1,$2,false)',[two.id,retry]); await query('select public.retry_order_notification($1,$2,false)',[two.id,retry]);
  await deny(()=>query('select public.retry_order_notification($1,$2,false)',[two.id,randomUUID()]),'Concurrent staff retry cannot duplicate queued job');
  await worker(); const uncertain=await claim();
  await root(); await query("update booking_private.notification_jobs set lease_until=now()-interval '1 second' where id=$1",[uncertain.id]);
  await worker(); check(await claim()===null,'Expired lease is not automatically resent');
  await root(); check((await query('select ambiguous from booking_private.notification_jobs where id=$1',[uncertain.id]))[0].ambiguous,'Expired worker lease is visibly ambiguous');
  await identity(staff); await deny(()=>query('select public.retry_order_notification($1,$2,true)',[uncertain.id,randomUUID()]),'Ambiguous retry requires a review interval');
  await root(); await query("update booking_private.notification_jobs set updated_at=now()-interval '11 minutes' where id=$1",[uncertain.id]);
  await identity(staff); await deny(()=>query('select public.retry_order_notification($1,$2,false)',[uncertain.id,randomUUID()]),'Ambiguous retry requires explicit duplicate-risk acknowledgment');
  await query('select public.retry_order_notification($1,$2,true)',[uncertain.id,randomUUID()]);
  await worker(); check(await processOne(db,capture,captureConfig),'Reviewed retry processed through actual worker orchestration');
  await identity(staff); await deny(()=>query('select public.retry_order_notification($1,$2,false)',[one.id,randomUUID()]),'Captured/successful jobs cannot be resent by staff');

  // Payment fixtures exist only in this disposable in-memory database.
  await root(); await query("update public.orders set payment_status='paid' where id=$1",[paid]);
  await identity(staff); await action(paid,'start');
  const document=await action(paid,'reserve',null,32);
  await root(); await query("insert into storage.objects(bucket_id,name,metadata) values('order-documents',$1,$2::jsonb)",[document.object_name,JSON.stringify({size:32,mimetype:'application/pdf'})]);
  await identity(staff); await action(paid,'complete',document.id); await action(paid,'publish',document.id); await action(paid,'publish',document.id);
  await root(); check((await query("select count(*)::int count from public.order_notifications where event='document_ready'"))[0].count===1,'Authorized publication enqueues once despite replay');
  await identity(staff); await action(paid,'withdraw',document.id);
  await worker(); while(await processOne(db,capture,captureConfig)) { /* Local capture only. */ }
  await root(); check((await query("select j.status from booking_private.notification_jobs j join public.order_notifications n on n.id=j.notification_id where n.event='document_ready'"))[0].status==='cancelled','Withdrawn document suppresses queued ready email');
  check((await query("select count(*)::int count from public.order_notifications where event='document_withdrawn'"))[0].count===1,'Published withdrawal remains visible in owner activity');
  await identity(staff); const replacement=await action(paid,'reserve',null,32);
  await root(); await query("insert into storage.objects(bucket_id,name,metadata) values('order-documents',$1,$2::jsonb)",[replacement.object_name,JSON.stringify({size:32,mimetype:'application/pdf'})]);
  await identity(staff); await action(paid,'complete',replacement.id); await action(paid,'publish',replacement.id);
  await root(); check((await query("select count(*)::int count from public.order_notifications where event='document_replaced'"))[0].count===1,'Replacement publication has an explicit customer event');
  await worker(); await processOne(db,capture,captureConfig);
  await deny(()=>query('select * from public.orders'),'Worker has no general order-table access');
  await deny(()=>query("select booking_private.enqueue_order_notification($1,'processing','forged')",[unpaid]),'Worker cannot manufacture business events');
  // Hotel-only and combo emails use the same whitelisted payload contract.
  await root();
  const reservationCatalog=(await query('select * from booking_private.reservation_catalog'))[0];
  const reservationOrders=[];
  for(const service of ['hotel','combo']) {
    const data={...booking('owner@example.test'),service,hotels:[{city:'Paris <script>unsafe</script>',country:'France',checkIn:'2099-06-15',checkOut:'2099-06-20',rooms:1,preference:'PRIVATE PROPERTY PREFERENCE'}]};
    if(service==='hotel') data.trip={type:'one-way',sectors:[],returnDate:''};
    await identity(owner); const draft=randomUUID();
    await query('select public.save_booking_draft($1,0,$2::jsonb)',[draft,JSON.stringify(data)]);
    const id=(await query('select public.create_booking_order($1,1,$2,$3,$4,$5) id',[draft,randomUUID(),service==='hotel'?69900:119900,reservationCatalog.policy_version,reservationCatalog.policy_text]))[0].id;
    reservationOrders.push({id,service});
  }
  await worker();
  for(let i=0;i<2;i++) {
    const job=await claim(), data=await payload(job);
    const service=reservationOrders.find(order=>order.id===data.order_id).service;
    check(data.summary.length===(service==='hotel'?1:3),`${service} email has only its actual flight/stay summary`);
    const message=renderNotification(data,captureConfig.origin);
    check(message.html.includes('&lt;script&gt;') && !message.html.includes('<script>') && !message.text.includes('PRIVATE PROPERTY PREFERENCE'),`${service} summary escapes location text and excludes property preference`);
    check(data.amount_minor===(service==='hotel'?69900:119900),`${service} email uses the persisted approved amount due`);
    await finish(job,await capture.send(data,message,job.token));
  }
  await root();
  const beforeRollback=(await query('select (select count(*) from public.orders)::int orders,(select count(*) from booking_private.notification_jobs)::int jobs'))[0];
  await identity(owner); const rollbackDraft=randomUUID();
  await query('select public.save_booking_draft($1,0,$2::jsonb)',[rollbackDraft,JSON.stringify(booking('owner@example.test'))]);
  await db.exec('begin');
  await query('select public.create_booking_order($1,1,$2,69900,$3,$4)',[rollbackDraft,randomUUID(),catalog.policy_version,catalog.policy_text]);
  await db.exec('rollback'); await root();
  const afterRollback=(await query('select (select count(*) from public.orders)::int orders,(select count(*) from booking_private.notification_jobs)::int jobs'))[0];
  check(JSON.stringify(beforeRollback)===JSON.stringify(afterRollback),'Rolling back order creation also rolls back its notification and outbox job');
  await identity(staff); const log=(await query('select public.admin_notification_log() result'))[0].result;
  check(log.jobs.length>=5 && log.jobs.every(job=>Array.isArray(job.history)),'Protected staff log includes attempt history and statuses');
  check(!JSON.stringify(log).includes('@') && !JSON.stringify(log).includes('Sensitive Passenger'),'Staff log excludes recipient addresses and passenger content');
  await root(); await query('update booking_private.staff_roles set revoked_at=now() where user_id=$1',[staff]);
  await identity(staff); await deny(()=>query('select public.admin_notification_log()'),'Staff revocation immediately blocks notification log');
  check(safeFailure({code:'ETIMEDOUT',message:'password and email'})==='ambiguous_delivery','Unknown network failures are sanitized and held');
  check(safeFailure({code:'EAUTH'})==='smtp_auth','Authentication errors are sanitized');
  assert.throws(()=>transportConfig({NOTIFICATIONS_TRANSPORT:'smtp'})); results.push({label:'SMTP fails closed without explicit configuration',passed:true});
  assert.throws(()=>transportConfig({NOTIFICATIONS_TRANSPORT:'smtp',NOTIFICATIONS_SMTP_MODE:'live'})); results.push({label:'Live sending requires explicit production enablement',passed:true});
  check((await readdir(`${directory}/mail`)).length>=4,'Unique local capture artifacts retained');
} catch(error) { failed=true; console.error(error); }
finally {
  capture.close(); await db.close();
  await writeFile(`${directory}/report.json`,JSON.stringify({kind:'isolated PGlite + local MIME capture; no actual SMTP',passed:results.length,failed:failed?1:0,checks:results},null,2));
  console.log(`Notification checks: ${results.length} passed, ${failed?1:0} failed. Evidence: ${directory}`);
  if(failed) process.exitCode=1;
}
