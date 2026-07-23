require("dotenv").config({ quiet: true });
const { Pool } = require("pg");
(async () => {
  const p = new Pool({ connectionString: process.env.DATABASE_URL });
  const pairs = [
    ["events", "status"],
    ["events", "visibility"],
    ["orders", "status"],
    ["tickets", "status"],
    ["payment_attempts", "status"],
  ];
  for (const [t, c] of pairs) {
    const r = await p.query(`SELECT DISTINCT ${c} AS v FROM ${t} WHERE ${c} IS NOT NULL`);
    console.log(t + "." + c + "=" + r.rows.map((x) => x.v).join("|"));
  }
  await p.end();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
