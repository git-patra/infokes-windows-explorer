import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const connectionString =
  process.env.DATABASE_URL ?? 'postgres://explorer:explorer@localhost:5432/explorer'

// For use in application code (pooled)
const queryClient = postgres(connectionString)
export const db = drizzle(queryClient, { schema, logger: process.env.NODE_ENV !== 'production' })

// For migrations only (single connection, no pooling)
export function createMigrationClient() {
  return postgres(connectionString, { max: 1 })
}
