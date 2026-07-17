require("dotenv").config({ quiet: true });
const { Pool } = require("pg");
(async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const tables = await pool.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema='public' AND table_type='BASE TABLE'
      ORDER BY table_name`);
    const fks = await pool.query(`
      SELECT
        tc.table_name AS from_table,
        kcu.column_name AS from_col,
        ccu.table_name AS to_table,
        ccu.column_name AS to_col,
        tc.constraint_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
      ORDER BY tc.table_name, kcu.column_name`);
    console.log("TABLE_COUNT=" + tables.rows.length);
    console.log("TABLES=" + tables.rows.map(r => r.table_name).join(","));
    console.log("FK_COUNT=" + fks.rows.length);
    fks.rows.forEach(r => {
      console.log("FK|" + r.from_table + "." + r.from_col + "->" + r.to_table + "." + r.to_col + "|" + r.constraint_name);
    });
    // columns that look like FKs but may lack constraints
    const candidates = await pool.query(`
      SELECT c.table_name, c.column_name
      FROM information_schema.columns c
      WHERE c.table_schema='public'
        AND (
          c.column_name LIKE '%_id'
          OR c.column_name IN ('id')
        )
      ORDER BY c.table_name, c.column_name`);
    const fkSet = new Set(fks.rows.map(r => r.from_table + "." + r.from_col));
    console.log("---MISSING_FK_CANDIDATES---");
    candidates.rows.forEach(r => {
      if (r.column_name === "id") return;
      const key = r.table_name + "." + r.column_name;
      if (!fkSet.has(key)) console.log("NO_FK|" + key);
    });
  } catch (e) {
    console.error("DB_ERROR=" + e.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
