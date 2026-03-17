import { neon } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-http"

declare global {
  var __aiCmoDb: ReturnType<typeof drizzle> | undefined
}

function createDatabase() {
  const databaseUrl =
    process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:5432/ai_cmo_app"

  return drizzle({
    client: neon(databaseUrl),
  })
}

export const db = globalThis.__aiCmoDb ?? createDatabase()

if (process.env.NODE_ENV !== "production") {
  globalThis.__aiCmoDb = db
}
