import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const connectionString =
  process.env.DATABASE_URL ?? 'postgres://explorer:explorer@localhost:5433/explorer'

// For use in application code (pooled)
// idle_timeout: drop connections idle for 20s (prevents stale connections after DB restart)
// max_lifetime: recycle connections every 30min regardless
const queryClient = postgres(connectionString, { idle_timeout: 20, max_lifetime: 1800 })
export const db = drizzle(queryClient, { schema, logger: process.env.NODE_ENV === 'development' })

// Graceful shutdown — close the pool when the process exits
const shutdown = () => queryClient.end()
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

// For migrations only (single connection, no pooling)
export function createMigrationClient() {
  return postgres(connectionString, { max: 1 })
}
