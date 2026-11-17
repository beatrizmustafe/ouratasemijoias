import 'dotenv/config';
import { runDbJsonMigrationToSupabase } from '../src/server/migrateToSupabase.ts';

async function main() {
  const report = await runDbJsonMigrationToSupabase(process.cwd());
  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  console.error('Migration failed:', err?.message || err);
  process.exit(1);
});
