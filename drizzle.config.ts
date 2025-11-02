// drizzle.config.ts — no imports; TS-safe without @types/node

// Let TS know "process" exists (avoids installing @types/node)
declare const process: { env: Record<string, string | undefined> };

export default {
  schema: [
    "./src/lib/db/schema.ts",        // your current path
    "./src/lib/db/schema/**/*.ts",   // optional future splits
    "./src/db/schema.ts",            // safe fallbacks
    "./src/db/schema/**/*.ts"
  ],
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: (process.env.DATABASE_URL ?? ""),
  },
  strict: true,
  verbose: true,
} as const;
