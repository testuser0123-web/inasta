import { db } from './lib/db';

async function main() {
  try {
    console.log("Checking if PostImage table exists...");
    // Attempt to query the table. If it doesn't exist, this will throw.
    // We can't use db.postImage because if the client wasn't generated with it, it won't be on the type.
    // But I generated the client earlier. So it should be there on the object even if not on the DB.

    // However, to be raw and sure, let's use $queryRaw.
    const result = await db.$queryRaw`SELECT to_regclass('public."PostImage"');`;
    console.log("Query result:", result);

    // Also try to count
    const count = await db.postImage.count();
    console.log("PostImage count:", count);
  } catch (e) {
    console.error("Error querying PostImage:", e);
  } finally {
    await db.$disconnect();
  }
}

main();
