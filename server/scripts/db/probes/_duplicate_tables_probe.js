require("dotenv").config({ quiet: true });
const { Pool } = require("pg");

const PAIRS = [
  ["promotions", "vouchers"],
  ["auth_users", "user_profiles"],
  ["organizer_profiles", "featured_profiles"],
];

(async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    for (const [a, b] of PAIRS) {
      console.log(`\n=== ${a} vs ${b} ===`);
      for (const t of [a, b]) {
        const cols = await pool.query(
          `SELECT column_name, data_type
           FROM information_schema.columns
           WHERE table_schema='public' AND table_name=$1
           ORDER BY ordinal_position`,
          [t]
        );
        const n = await pool.query(`SELECT count(*)::int AS c FROM ${t}`);
        console.log(`\n${t} ROWS=${n.rows[0].c}`);
        console.log(cols.rows.map((r) => r.column_name).join(", "));
      }
      const ca = await pool.query(
        `SELECT column_name FROM information_schema.columns
         WHERE table_schema='public' AND table_name=$1`,
        [a]
      );
      const cb = await pool.query(
        `SELECT column_name FROM information_schema.columns
         WHERE table_schema='public' AND table_name=$1`,
        [b]
      );
      const sa = new Set(ca.rows.map((r) => r.column_name));
      const sb = new Set(cb.rows.map((r) => r.column_name));
      const both = [...sa].filter((x) => sb.has(x)).sort();
      const onlyA = [...sa].filter((x) => !sb.has(x)).sort();
      const onlyB = [...sb].filter((x) => !sa.has(x)).sort();
      console.log("\nSHARED_COLS=" + both.join(","));
      console.log("ONLY_" + a + "=" + onlyA.join(","));
      console.log("ONLY_" + b + "=" + onlyB.join(","));
    }

    // promotions/vouchers codes overlap?
    const promoCodes = await pool.query(
      `SELECT code FROM promotions WHERE code IS NOT NULL LIMIT 5`
    );
    const voucherCodes = await pool.query(
      `SELECT code FROM vouchers WHERE code IS NOT NULL LIMIT 5`
    );
    console.log("\nPROMO_SAMPLE_CODES=" + promoCodes.rows.map((r) => r.code).join(","));
    console.log("VOUCHER_SAMPLE_CODES=" + voucherCodes.rows.map((r) => r.code).join(","));

    // audit_logs single table?
    const audit = await pool.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name='audit_logs' ORDER BY ordinal_position`
    );
    console.log("\naudit_logs COLS=" + audit.rows.map((r) => r.column_name).join(","));
  } finally {
    await pool.end();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
