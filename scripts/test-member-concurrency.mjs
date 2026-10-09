import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { randomUUID } from 'node:crypto'
import assert from 'node:assert/strict'

// Deliberately uses only the named local Docker database, never hosted settings.
const exec = promisify(execFile)
const people = [randomUUID(), randomUUID()]
const companies = [randomUUID(), randomUUID()]
const sql = async (query) => (await exec('docker', ['exec', 'supabase_db_orbit', 'psql', '-U', 'postgres', '-d', 'postgres', '-X', '-A', '-t', '-v', 'ON_ERROR_STOP=1', '-c', query])).stdout.trim()

try {
  await sql(`insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values
    ${people.map((id, i) => `('${id}','concurrency-${id}@example.test',now(),' {"full_name":"Concurrency ${i}"}')`).join(',')};
    insert into public.workspaces(id,name) values ${companies.map(id => `('${id}','Concurrency test')`).join(',')};
    insert into public.workspace_members(workspace_id,user_id,role) values
    ${companies.flatMap(company => people.map(person => `('${company}','${person}','admin')`)).join(',')};`)
  for (const [index, action] of ['demote', 'remove'].entries()) {
    const company = companies[index]
    const results = await Promise.allSettled(people.map(person => sql(`begin;
      set local role authenticated;
      select set_config('request.jwt.claim.sub','${person}',true);
      select public.${action === 'demote'
        ? `change_member_role('${company}','${person}','admin','member')`
        : `remove_workspace_member('${company}','${person}','admin',0)`};
      select pg_sleep(0.3); commit;`)))
    assert.equal(results.filter(result => result.status === 'fulfilled').length, 1, `${action}: exactly one concurrent mutation may succeed`)
    const rejected = results.find(result => result.status === 'rejected')
    assert.match(rejected.reason.stderr, /Last administrator/)
    assert.equal(await sql(`select count(*) from public.workspace_members where workspace_id='${company}' and role='admin' and removed_at is null`), '1')
    assert.equal(await sql(`select count(*) from public.workspace_member_events where workspace_id='${company}'`), '1')
    process.stdout.write(`${action}: concurrent last-admin protection and audit passed\n`)
  }
} finally {
  await sql(`delete from public.workspaces where id in (${companies.map(id => `'${id}'`).join(',')});
    delete from auth.users where id in (${people.map(id => `'${id}'`).join(',')});`)
}
