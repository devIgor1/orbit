import { appendFile } from 'node:fs/promises'
import { createPrChecksReader } from './pr-validation-github.ts'
import { waitForPrValidations } from './pr-validation-runner.ts'

const sha = process.env.PR_HEAD_SHA ?? ''
const jobs = JSON.parse(process.env.PR_JOB_RESULTS ?? 'null')
const readChecks = createPrChecksReader(process.env.GITHUB_REPOSITORY ?? '', sha, process.env.GITHUB_TOKEN ?? '')
await waitForPrValidations({ jobs, sha, readChecks })
const summary = `CI e preview da Vercel aprovados para o commit ${sha}.\n`
console.log(summary)
if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, summary)
