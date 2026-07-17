require("dotenv").config({ quiet: true });
const { Pool } = require("pg");

(async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const mig = await pool.query(
      "SELECT filename FROM schema_migrations ORDER BY filename"
    );
    const tables = await pool.query(`
      SELECT count(*)::int AS c FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`);
    const fks = await pool.query(`
      SELECT count(*)::int AS c FROM information_schema.table_constraints
      WHERE constraint_type = 'FOREIGN KEY' AND table_schema = 'public'`);
    const fkNames = await pool.query(`
      SELECT conname FROM pg_constraint
      WHERE contype = 'f' AND connamespace = 'public'::regnamespace
      ORDER BY 1`);
    const checks = await pool.query(`
      SELECT conname FROM pg_constraint
      WHERE contype = 'c' AND connamespace = 'public'::regnamespace
      ORDER BY 1`);
    const nonStyle = fkNames.rows.filter((r) => !r.conname.startsWith("fk_"));
    console.log("MIG_COUNT=" + mig.rows.length);
    console.log("LAST_MIG=" + mig.rows[mig.rows.length - 1].filename);
    console.log("THROUGH=" + mig.rows.map((r) => r.filename).slice(-6).join(","));
    console.log("TABLES=" + tables.rows[0].c);
    console.log("FKS=" + fks.rows[0].c);
    console.log("CHECK_COUNT=" + checks.rows.length);
    console.log("CHECKS=" + checks.rows.map((r) => r.conname).join(","));
    console.log("NON_FK_STYLE=" + nonStyle.length);
    if (nonStyle.length) {
      console.log("BAD=" + nonStyle.map((r) => r.conname).join(","));
    }
  } finally {
    await pool.end();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
