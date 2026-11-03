// Isolated PostgreSQL contract tests. Auth is a synthetic shim, NOT live Supabase.
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

const db = await PGlite.create();
let checks = 0;
const check = (condition, message) => {
  assert.ok(condition, message);
  checks++;
};
const denied = async (fn, message) => {
  await assert.rejects(fn, undefined, message);
  checks++;
};
const a = randomUUID(),
  b = randomUUID();
try {
  await db.exec(`
    create role anon; create role authenticated;
    create role booking_migration_owner nosuperuser nobypassrls;
    create schema auth;
    create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,is_anonymous boolean default false);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to anon,authenticated;
    grant execute on function auth.uid() to anon,authenticated;
    grant usage on schema auth to booking_migration_owner;
    grant select, references on auth.users to booking_migration_owner;
    grant create, usage on schema public to booking_migration_owner;
    -- Simulate broad inherited PUBLIC/default object grants. The migration must
    -- remove these even if the hosting project's defaults are more permissive.
    alter default privileges for role booking_migration_owner grant all on tables to public,anon,authenticated;
    alter default privileges for role booking_migration_owner grant all on sequences to public,anon,authenticated;
    alter default privileges for role booking_migration_owner grant execute on functions to public,anon,authenticated;
  `);
  const databaseGrant = await db.query("select format('grant create on database %I to booking_migration_owner',current_database()) as sql");
  await db.exec(databaseGrant.rows[0].sql);
  await db.query(
    "insert into auth.users(id,email,email_confirmed_at) values ($1,$2,now()),($3,$4,now())",
    [a, "a@example.test", b, "b@example.test"],
  );
  await db.exec('set role booking_migration_owner');
  await db.exec(
    await readFile(
      new URL(
        "../supabase/migrations/202610220001_customer_bookings.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  await db.exec('reset role');
  checks++;
  const { rows: [catalogSecurity] } = await db.query(`
    select c.relrowsecurity, c.relforcerowsecurity, r.rolname as owner,
      r.rolsuper, r.rolbypassrls,
      (select count(*)::int from pg_policy p where p.polrelid=c.oid) as policies
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
    join pg_roles r on r.oid=c.relowner
    where n.nspname='booking_private' and c.relname='catalog'
  `);
  check(catalogSecurity.relrowsecurity && !catalogSecurity.relforcerowsecurity && catalogSecurity.policies===0,
    'Catalog has default-deny RLS with no customer policies; owner access is intentional');
  check(catalogSecurity.owner==='booking_migration_owner' && !catalogSecurity.rolsuper && !catalogSecurity.rolbypassrls,
    'Migration is tested with a non-superuser owner without BYPASSRLS');
  const publicAcl = await db.query(`
    select count(*)::int as n from (
      select a.grantee from pg_namespace n cross join lateral aclexplode(coalesce(n.nspacl,acldefault('n',n.nspowner))) a
      where n.nspname='booking_private'
      union all
      select a.grantee from pg_class c join pg_namespace n on n.oid=c.relnamespace
      cross join lateral aclexplode(coalesce(c.relacl,acldefault(case when c.relkind='S' then 'S'::"char" else 'r'::"char" end,c.relowner))) a
      where n.nspname='booking_private' and c.relkind in ('r','S')
      union all
      select a.grantee from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      cross join lateral aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
      where n.nspname='booking_private' or (n.nspname='public' and p.proname in ('save_booking_draft','create_booking_order'))
    ) privileges where grantee=0
  `);
  check(publicAcl.rows[0].n===0,'PUBLIC (all roles) has no private schema/object or RPC privileges');
  for (const role of ['anon','authenticated']) {
    const { rows: [access] } = await db.query(`
      select has_schema_privilege($1,'booking_private','USAGE') as schema_usage,
        has_schema_privilege($1,'booking_private','CREATE') as schema_create,
        has_table_privilege($1,'booking_private.catalog','SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') as table_access,
        has_sequence_privilege($1,'booking_private.order_reference_seq','USAGE,SELECT,UPDATE') as sequence_access,
        has_function_privilege($1,'booking_private.customer_email()','EXECUTE') as helper_execute,
        has_function_privilege($1,'public.save_booking_draft(uuid,integer,jsonb)','EXECUTE') as save_execute,
        has_function_privilege($1,'public.create_booking_order(uuid,integer,uuid,integer,text,text)','EXECUTE') as order_execute
    `,[role]);
    check(!access.schema_usage && !access.schema_create && !access.table_access && !access.sequence_access && !access.helper_execute,
      `${role} has no effective private access including PUBLIC/inherited grants`);
    check(access.save_execute===(role==='authenticated') && access.order_execute===(role==='authenticated'),
      `${role} has only the intended public RPC execute privileges`);
    await db.exec(`set role ${role}`);
    await denied(()=>db.exec('select * from booking_private.catalog'),`${role} direct catalog read denied`);
    await denied(()=>db.exec('update booking_private.catalog set one_way_minor=1'),`${role} catalog mutation denied`);
    await denied(()=>db.exec('select booking_private.customer_email()'),`${role} private helper call denied`);
    await db.exec('reset role');
  }
  const rpcSecurity = await db.query(`
    select p.proname,p.prosecdef,p.proconfig,p.proowner=c.relowner as owns_catalog
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    cross join pg_class c join pg_namespace cn on cn.oid=c.relnamespace
    where n.nspname='public' and p.proname in ('save_booking_draft','create_booking_order')
      and cn.nspname='booking_private' and c.relname='catalog'
  `);
  check(rpcSecurity.rows.length===2 && rpcSecurity.rows.every(row=>row.prosecdef && row.owns_catalog && row.proconfig.includes('search_path=""')),
    'RPCs execute as catalog owner with an empty search_path');
  check((await db.query("select count(*)::int as n from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in ('booking_drafts','orders','order_sectors','order_passengers','order_contacts') and c.relrowsecurity")).rows[0].n===5,
    'All five customer tables retain RLS');
  // Prove the additional RLS layer works if a future edit mistakenly grants
  // schema/table access. These grants exist only inside this isolated test DB.
  await db.exec('grant usage on schema booking_private to anon,authenticated; grant select,insert,update,delete on booking_private.catalog to anon,authenticated;');
  for (const role of ['anon','authenticated']) {
    await db.exec(`set role ${role}`);
    check((await db.query('select * from booking_private.catalog')).rows.length===0,`${role} sees no catalog rows even after accidental grants`);
    check((await db.query('update booking_private.catalog set one_way_minor=1 returning singleton')).rows.length===0,`${role} cannot change catalog prices even after accidental grants`);
    await denied(()=>db.exec("insert into booking_private.catalog values(true,1,1,1,'INR','bad','bad')"),`${role} cannot insert catalog rows under default-deny RLS`);
    await db.exec('reset role');
  }
  await db.exec('revoke all on schema booking_private from anon,authenticated; revoke all on booking_private.catalog from anon,authenticated;');
  const {
    rows: [catalog],
  } = await db.query("select * from booking_private.catalog");
  const source = await readFile(
    new URL("../src/config/business.ts", import.meta.url),
    "utf8",
  );
  check(
    source.includes(catalog.policy_text) &&
      source.includes(catalog.policy_version),
    "Policy snapshot matches server configuration",
  );
  const identity = async (id) => {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
    await db.exec("set role authenticated");
  };
  const booking = (email) => ({
    trip: {
      type: "return",
      sectors: [{ from: "Delhi", to: "Dubai", departure: "2099-06-15" }],
      returnDate: "2099-06-20",
    },
    passengers: [
      {
        givenNames: "Test",
        surname: "Traveller",
        singleName: false,
        dob: "1990-01-01",
        sex: "F",
        nationality: "",
      },
    ],
    communication: {
      accountEmail: email,
      channel: "email",
      whatsapp: "",
      alternateContact: "",
      purpose: "",
      appointmentDate: "",
      specialInstructions: "",
    },
    confirmations: { detailsCorrect: true, termsAccepted: true },
  });
  const save = (id, revision, data) =>
    db.query("select (public.save_booking_draft($1,$2,$3)).*", [
      id,
      revision,
      data,
    ]);
  const order = (id, revision, key, price = 69900) =>
    db.query("select public.create_booking_order($1,$2,$3,$4,$5,$6) as id", [
      id,
      revision,
      key,
      price,
      catalog.policy_version,
      catalog.policy_text,
    ]);
  const idA = randomUUID(),
    idB = randomUUID(),
    key = randomUUID();
  await identity(a);
  const first = await save(idA, 0, booking("a@example.test"));
  check(
    first.rows[0].owner_id === a && first.rows[0].revision === 1,
    "Owner derived from auth identity",
  );
  check(
    (await save(idA, 0, booking("a@example.test"))).rows[0].revision === 1,
    "Lost save response retry is idempotent",
  );
  const changed = booking("a@example.test");
  changed.communication.purpose = "Visa";
  await denied(() => save(idA, 0, changed), "Stale edits rejected");
  await denied(
    () => save(idA, null, changed),
    "Null revision cannot bypass optimistic concurrency",
  );
  await denied(
    () => save(randomUUID(), 0, booking("b@example.test")),
    "Verified email reconciliation enforced",
  );
  const malformed = booking("a@example.test");
  malformed.passengers[0].dob = "1990-02-30";
  await denied(
    () => save(randomUUID(), 0, malformed),
    "Malformed dates rejected in database",
  );
  await denied(
    () => order(idA, 1, key, 1),
    "Client price manipulation rejected",
  );
  check(
    (await db.query("select count(*)::int as n from public.orders")).rows[0]
      .n === 0,
    "Rejected order leaves no partial order",
  );
  const created = (await order(idA, 1, key)).rows[0].id;
  check(
    (await order(idA, 1, key)).rows[0].id === created,
    "Repeated idempotency key returns the same order",
  );
  check(
    (await order(idA, 1, randomUUID())).rows[0].id === created,
    "A second key for the same draft still returns one order",
  );
  const savedOrder = (
    await db.query("select * from public.orders where id=$1", [created])
  ).rows[0];
  check(
    savedOrder.total_minor === 69900 &&
      savedOrder.payment_status === "awaiting_payment" &&
      savedOrder.fulfilment_status === "not_started",
    "Trusted prices and independent unpaid statuses",
  );
  check(
    (await db.query("select count(*)::int as n from public.order_sectors"))
      .rows[0].n === 2,
    "Return journey materialized transactionally",
  );
  check(
    (await db.query("select count(*)::int as n from public.order_passengers"))
      .rows[0].n === 1,
    "Passenger created",
  );
  check(
    (await db.query("select count(*)::int as n from public.order_contacts"))
      .rows[0].n === 1,
    "Contact created",
  );
  await denied(() => save(idA, 1, changed), "Submitted drafts are immutable");
  for (const assignment of [
    "total_minor=1",
    "payment_status='paid'",
    "fulfilment_status='completed'",
    `owner_id='${b}'`,
  ]) {
    await denied(
      () => db.exec(`update public.orders set ${assignment}`),
      "Direct order mutation denied",
    );
  }
  await denied(
    () =>
      db.exec("update public.booking_drafts set owner_id=gen_random_uuid()"),
    "Direct draft owner mutation denied",
  );
  await denied(
    () => db.exec("update auth.users set email='changed@example.test'"),
    "No privileged identity mutation",
  );
  await denied(
    () => db.exec("select * from booking_private.catalog"),
    "Catalog is private",
  );
  await identity(b);
  for (const table of [
    "booking_drafts",
    "orders",
    "order_sectors",
    "order_passengers",
    "order_contacts",
  ]) {
    check(
      (await db.query(`select count(*)::int as n from public.${table}`)).rows[0]
        .n === 0,
      `RLS isolates ${table}`,
    );
  }
  await denied(
    () => order(idA, 1, randomUUID()),
    "Other customer cannot create from A draft",
  );
  await denied(
    () => save(idA, 1, booking("b@example.test")),
    "Other customer cannot overwrite A draft",
  );
  await save(idB, 0, booking("b@example.test"));
  check(
    (await db.query("select count(*)::int as n from public.booking_drafts"))
      .rows[0].n === 1,
    "B can read their own draft",
  );
  await db.exec("reset role");
  // Inject a child-record failure as DB administrator to prove full transaction rollback.
  await db.exec(
    "create function booking_private.test_fail() returns trigger language plpgsql as $$ begin raise exception 'injected failure'; end $$; create trigger test_fail before insert on public.order_contacts for each row execute function booking_private.test_fail();",
  );
  await identity(b);
  await denied(
    () => order(idB, 1, randomUUID()),
    "Child failure rolls back order",
  );
  check(
    (await db.query("select count(*)::int as n from public.orders")).rows[0]
      .n === 0,
    "No order survives child failure",
  );
  check(
    (
      await db.query("select status from public.booking_drafts where id=$1", [
        idB,
      ])
    ).rows[0].status === "draft",
    "Draft remains resumable after rollback",
  );
  await db.exec(
    "reset role; drop trigger test_fail on public.order_contacts; set role anon;",
  );
  for (const table of [
    "booking_drafts",
    "orders",
    "order_sectors",
    "order_passengers",
    "order_contacts",
  ])
    await denied(
      () => db.exec(`select * from public.${table}`),
      "Anonymous table access denied",
    );
  await denied(
    () => save(randomUUID(), 0, booking("a@example.test")),
    "Anonymous RPC denied",
  );
  console.log(
    `PASS: ${checks} isolated PostgreSQL migration, grants, RLS, validation, transaction and retry assertions. Synthetic auth shim; live Supabase/OTP and concurrent multi-connection verification remain pending.`,
  );
} finally {
  await db.close();
}
