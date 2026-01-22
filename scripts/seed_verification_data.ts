import { db } from '../lib/db';
import bcrypt from 'bcryptjs';

async function main() {
  const now = new Date();
  const future = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const hashedPassword = await bcrypt.hash('password', 10);

  // Subscriber User (>= 100)
  try {
      const subscriber = await db.user.create({
        data: {
          username: 'verif_subscriber',
          password: hashedPassword,
          subscriptionAmount: 150,
          subscriptionExpiresAt: future,
          subscriptionDate: now,
          isVerified: false,
        }
      });
      console.log(`Created subscriber: ${subscriber.username}`);
  } catch (e) {
      console.log('verif_subscriber likely exists');
  }

  // Gold + Subscriber User (>= 300)
  try {
      const goldSubscriber = await db.user.create({
        data: {
          username: 'verif_gold',
          password: hashedPassword,
          subscriptionAmount: 500,
          subscriptionExpiresAt: future,
          subscriptionDate: now,
          isVerified: true,
        }
      });
      console.log(`Created gold subscriber: ${goldSubscriber.username}`);
  } catch (e) {
      console.log('verif_gold likely exists');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
