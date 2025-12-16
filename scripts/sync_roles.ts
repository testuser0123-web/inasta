import { db } from '../lib/db';
import { ROLE_ASSIGNMENTS } from '../lib/role_assignments';
import dotenv from 'dotenv';

// Load environment variables if not already loaded (though Next.js usually handles this, standalone scripts might not)
dotenv.config();

async function main() {
  console.log('Starting role sync...');

  for (const [username, roles] of Object.entries(ROLE_ASSIGNMENTS)) {
    try {
      const user = await db.user.findUnique({
        where: { username },
      });

      if (user) {
        // Only update if roles are different to avoid unnecessary writes/logs?
        // For simplicity, just update.
        await db.user.update({
          where: { username },
          data: { roles },
        });
        console.log(`Updated roles for user: ${username} -> [${roles.join(', ')}]`);
      } else {
        console.warn(`User not found: ${username}`);
      }
    } catch (error) {
      console.error(`Failed to update user ${username}:`, error);
    }
  }

  console.log('Role sync complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    // db is a singleton export, explicit disconnect might not be exposed or necessary if we just exit,
    // but PrismaClient usually has $disconnect.
    // Since db is PrismaClient instance:
    await db.$disconnect();
  });
