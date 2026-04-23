import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { getDatabaseUrl } from "@/lib/env";

type DrizzleClient = ReturnType<typeof drizzle<typeof schema>>;

let _db: DrizzleClient | null = null;

export const db = new Proxy({} as DrizzleClient, {
  get(_, prop) {
    if (!_db) {
      const postgresUrl = getDatabaseUrl();
      const client = postgres(postgresUrl);
      _db = drizzle(client, { schema });
    }
    return Reflect.get(_db, prop);
  },
});
