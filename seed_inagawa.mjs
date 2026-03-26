import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding 15 test users...');

  for (let i = 1; i <= 15; i++) {
    const randomBalance = Math.floor(Math.random() * 15000) - 5000; // Between -5000 and 10000

    // Create user
    const user = await prisma.user.create({
      data: {
        username: `test_bot_${i}_${Date.now()}`,
        password: 'password123',
      }
    });

    // Create inagawa record
    await prisma.inagawa.create({
      data: {
        userId: user.id,
        balance: randomBalance,
      }
    });

    console.log(`Created user ${user.username} with balance ${randomBalance}`);
  }

  console.log('Done!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
