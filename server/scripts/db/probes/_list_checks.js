require("dotenv").config({ quiet: true });
const { Pool } = require("pg");
(async () => {
  const p = new Pool({ connectionString: process.env.DATABASE_URL });
  const r = await p.query(`
    SELECT conname, pg_get_constraintdef(oid) AS def
    FROM pg_constraint
    WHERE contype = 'c' AND connamespace = 'public'::regnamespace
      AND conname LIKE 'chk_%'
    ORDER BY 1`);
  r.rows.forEach((x) => console.log(x.conname + " :: " + x.def));
  console.log("CHECK_COUNT=" + r.rows.length);
  await p.end();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
