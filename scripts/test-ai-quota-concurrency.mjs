import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { randomUUID } from 'node:crypto'
import assert from 'node:assert/strict'

// Default: named local Docker database. Native alternative is always loopback, never a hosted URL.
const run = promisify(execFile)
const port = process.env.ORBIT_AI_TEST_DB_PORT
if (port && (!/^\d+$/.test(port) || Number(port) < 1024 || Number(port) > 65535)) throw new Error('Invalid local test port.')
const command = port ? (process.env.ORBIT_AI_TEST_PSQL || 'psql') : 'docker'
const args = port ? ['-h', '127.0.0.1', '-p', port, '-w'] : ['exec', 'supabase_db_orbit', 'psql']
const sql = async query => (await run(command, [...args, '-U', 'postgres', '-d', 'postgres', '-XAt', '-v', 'ON_ERROR_STOP=1', '-c', query])).stdout.trim()
const people = [randomUUID(), randomUUID(), randomUUID()]
const company = randomUUID()
const projects = [randomUUID(), randomUUID()]

try {
  await sql(`insert into auth.users(id,email,raw_user_meta_data) values
    ${people.map(id => `('${id}','${id}@ai-concurrency.test','{}')`).join(',')};
    insert into public.workspaces(id,name) values ('${company}','AI quota concurrency');
    insert into public.workspace_members(workspace_id,user_id,role) values
    ${people.map(id => `('${company}','${id}','admin')`).join(',')};
    insert into public.projects(id,workspace_id,title,created_by) values
    ${projects.map(id => `('${id}','${company}','Concurrent project','${people[0]}')`).join(',')};`)
  for (const { label, limit, age } of [
    { label: '10 minutes', limit: 75, age: '0 seconds' },
    { label: '24 hours', limit: 750, age: '2 hours' },
  ]) {
    await sql(`delete from private.ai_task_attempts where workspace_id='${company}';
      delete from private.ai_task_requests where workspace_id='${company}';
      insert into private.ai_task_attempts(user_id,workspace_id,created_at)
      select '${people[2]}','${company}',now()-interval '${age}' from generate_series(1,${limit - 1});`)
    const attempts = await Promise.allSettled(people.slice(0, 2).map((person, index) => sql(`begin;
      set local role authenticated;
      select set_config('request.jwt.claim.sub','${person}',true);
      select public.prepare_ai_task_request('${randomUUID()}','${company}','${projects[index]}',repeat('a',64));
      select pg_sleep(0.5); commit;`)))
    assert.equal(attempts.filter(result => result.status === 'fulfilled').length, 1, `${label}: one slot, one winner`)
    assert.ok(attempts.some(result => result.status === 'rejected' && result.reason.stderr.includes('AI_WORKSPACE_RATE_LIMITED')))
    assert.equal(await sql(`select count(*) from private.ai_task_attempts where workspace_id='${company}'`), String(limit))
    assert.equal(await sql(`select count(*) from private.ai_task_requests where workspace_id='${company}'`), '1')
    process.stdout.write(`${label}: concurrent users in different projects cannot exceed the company quota.\n`)
  }
} finally {
  await sql(`delete from public.workspaces where id='${company}';
    delete from auth.users where id in (${people.map(id => `'${id}'`).join(',')});`)
}
