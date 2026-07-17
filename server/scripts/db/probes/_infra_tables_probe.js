require("dotenv").config({ quiet: true });
const { Pool } = require("pg");
(async () => {
  const p = new Pool({ connectionString: process.env.DATABASE_URL });
  const tables = ["audit_logs", "outbox", "auth_tokens", "idempotency_keys", "platform_fees", "schema_migrations"];
  for (const t of tables) {
    const cols = await p.query(
      `SELECT column_name, data_type, is_nullable, column_default
       FROM information_schema.columns
       WHERE table_schema='public' AND table_name=$1
       ORDER BY ordinal_position`,
      [t]
    );
    const fks = await p.query(
      `SELECT tc.constraint_name, kcu.column_name, ccu.table_name AS ref_table, ccu.column_name AS ref_col
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu ON tc.constraint_name=kcu.constraint_name
       JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name=tc.constraint_name
       WHERE tc.table_schema='public' AND tc.table_name=$1 AND tc.constraint_type='FOREIGN KEY'`,
      [t]
    );
    console.log("\n### " + t);
    if (cols.rows.length === 0) {
      console.log("MISSING_TABLE");
      continue;
    }
    cols.rows.forEach((c) =>
      console.log(
        "  COL " + c.column_name + " " + c.data_type + " null=" + c.is_nullable + " def=" + (c.column_default || "")
      )
    );
    if (fks.rows.length === 0) console.log("  FK none");
    else fks.rows.forEach((f) => console.log("  FK " + f.column_name + "->" + f.ref_table + "." + f.ref_col));
  }
  await p.end();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
