require("dotenv").config({ quiet: true });
const { Pool } = require("pg");

(async () => {
  const p = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const r = await p.query(`
      SELECT table_name, column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND (
          data_type IN ('bigint', 'timestamp with time zone', 'timestamp without time zone')
          OR column_name LIKE '%_at'
          OR column_name IN ('date', 'end_date', 'birth_date', 'purchase_date')
        )
      ORDER BY table_name, column_name`);
    r.rows.forEach((x) =>
      console.log(x.table_name + "." + x.column_name + ":" + x.data_type)
    );
    const a = await p.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name='auth_users' ORDER BY 1`
    );
    const u = await p.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name='user_profiles' ORDER BY 1`
    );
    console.log("AUTH=" + a.rows.map((x) => x.column_name).join(","));
    console.log("PROF=" + u.rows.map((x) => x.column_name).join(","));
  } finally {
    await p.end();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
