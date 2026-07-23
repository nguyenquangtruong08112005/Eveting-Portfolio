require('dotenv').config({ quiet: true });
const { Pool } = require('pg');
(async () => {
  const p = new Pool({ connectionString: process.env.DATABASE_URL });
  const r = await p.query(`
    SELECT COUNT(*)::int AS n
    FROM information_schema.table_constraints
    WHERE constraint_type = 'FOREIGN KEY' AND table_schema = 'public'`);
  console.log('FK_COUNT=' + r.rows[0].n);
  const names = await p.query(`
    SELECT conname
    FROM pg_constraint
    WHERE contype = 'f' AND connamespace = 'public'::regnamespace
    ORDER BY 1`);
  names.rows.forEach((x) => console.log(x.conname));
  await p.end();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
