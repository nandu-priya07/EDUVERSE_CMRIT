import { pool } from "../database/db.js";

async function truncateAllTables() {
  console.log("⚠️  Starting database truncation script...");

  try {
    // Fetch all user tables in public schema
    const res = await pool.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
    `);

    const tables = res.rows.map((row) => row.tablename);

    if (tables.length === 0) {
      console.log("ℹ️  No tables found in public schema.");
      process.exit(0);
    }

    console.log(`📋 Found ${tables.length} tables to truncate:`);
    tables.forEach((t) => console.log(`   - ${t}`));

    // Construct TRUNCATE statement with CASCADE to handle foreign keys
    const tableList = tables.map((t) => `"${t}"`).join(", ");
    const truncateQuery = `TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE;`;

    console.log("\n🧹 Executing TRUNCATE TABLE ... RESTART IDENTITY CASCADE ...");
    await pool.query(truncateQuery);

    console.log("✅ Successfully truncated all tables in the database!\n");
  } catch (err) {
    console.error("❌ Error truncating tables:", err.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

truncateAllTables();
