import 'dotenv/config'
import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { Client } from 'pg'

const migrationsDir = path.resolve(import.meta.dirname, '../supabase/migrations')

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()

  await client.query(
    'create table if not exists _migrations (name text primary key, applied_at timestamptz not null default now())'
  )
  const { rows: applied } = await client.query('select name from _migrations')
  const appliedNames = new Set(applied.map((r) => r.name))

  const files = readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort()

  for (const file of files) {
    if (appliedNames.has(file)) {
      console.log(`Skipping ${file} (already applied)`)
      continue
    }
    const sql = readFileSync(path.join(migrationsDir, file), 'utf8')
    console.log(`Applying ${file}...`)
    await client.query('begin')
    try {
      await client.query(sql)
      await client.query('insert into _migrations (name) values ($1)', [file])
      await client.query('commit')
    } catch (err) {
      await client.query('rollback')
      throw err
    }
  }

  await client.end()
  console.log('Done.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
