'use server';

import { db as prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

// Configuration
const INAGAWA_BASE_ALLOWANCE = 100;
const INAGAWA_REPDIGIT_PENALTY = -3000;

export async function getInagawaStatus() {
  const session = await getSession();
  if (!session?.id) {
    return { error: 'Not logged in' };
  }

  const userId = session.id;

  // Ensure Inagawa record exists
  let inagawa = await prisma.inagawa.findUnique({
    where: { userId },
  });

  if (!inagawa) {
    inagawa = await prisma.inagawa.create({
      data: { userId, balance: 0 },
    });
  }

  // Check if they have already received it today (JST)
  let hasReceivedToday = false;
  if (inagawa.lastLoginDate) {
    const jstFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric'
    });

    const lastLogin = new Date(inagawa.lastLoginDate);
    const now = new Date();

    const lastLoginJSTStr = jstFormatter.format(lastLogin);
    const nowJSTStr = jstFormatter.format(now);

    if (lastLoginJSTStr === nowJSTStr) {
      hasReceivedToday = true;
    }
  }

  return {
    inagawa,
    hasReceivedToday,
  };
}

export async function giveAllowance(give: boolean = true) {
  const session = await getSession();
  if (!session?.id) {
    return { error: 'Not logged in' };
  }

  const userId = session.id;

  // Fetch status again to prevent double clicking
  const status = await getInagawaStatus();
  if (status.error) return { error: status.error };
  if (status.hasReceivedToday) {
     return { error: 'Already received today' };
  }

  // Get current JST time
  const now = new Date();
  const jstFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Tokyo',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  const parts = jstFormatter.formatToParts(now);
  const hours = parts.find(p => p.type === 'hour')?.value || '00';
  const minutes = parts.find(p => p.type === 'minute')?.value || '00';
  const seconds = parts.find(p => p.type === 'second')?.value || '00';

  const ms = now.getMilliseconds();

  // Format milliseconds to 2 digits (e.g. 05, 12, 99)
  // getMilliseconds returns 0-999. To get 2 digits similar to stopwatch, we divide by 10
  const centiseconds = Math.floor(ms / 10);
  const centisecondsStr = String(centiseconds).padStart(2, '0');

  const timeString = `${hours}:${minutes}:${seconds}.${centisecondsStr}`;

  const isRepdigit = centisecondsStr[0] === centisecondsStr[1];

  let amount = give ? (isRepdigit ? INAGAWA_REPDIGIT_PENALTY : INAGAWA_BASE_ALLOWANCE) : 0;

  const positiveMessages = [
    'ᶘｲ^⇁^ﾅ川「おこづかいやるよ」',
    'ᶘｲ^⇁^ﾅ川「ほらよ」',
    'ᶘｲ^⇁^ﾅ川「今日もおつかれ」',
    'ᶘｲ^⇁^ﾅ川「まいどあり」'
  ];

  const negativeMessages = [
    'ᶘｲ^⇁^ﾅ川「ぞろ目だぞ没収だ」',
    'ᶘｲ^⇁^ﾅ川「残念だったな」',
    'ᶘｲ^⇁^ﾅ川「お前の金は俺の金」',
    'ᶘｲ^⇁^ﾅ川「甘えるな」'
  ];

  const neutralMessages = [
    'ᶘｲ^⇁^ﾅ川「ケチめ」',
    'ᶘｲ^⇁^ﾅ川「ちぇっ」',
    'ᶘｲ^⇁^ﾅ川「まあいいだろう」',
    'ᶘｲ^⇁^ﾅ川「明日も来いよ」'
  ];

  let message = '';
  if (!give) {
    message = neutralMessages[Math.floor(Math.random() * neutralMessages.length)];
  } else if (isRepdigit) {
    message = negativeMessages[Math.floor(Math.random() * negativeMessages.length)];
  } else {
    message = positiveMessages[Math.floor(Math.random() * positiveMessages.length)];
  }

  // Run update transaction
  await prisma.$transaction([
    prisma.inagawa.update({
      where: { userId },
      data: {
        balance: { increment: amount },
        lastLoginDate: now,
      },
    }),
    prisma.inagawaHistory.create({
      data: {
        userId,
        amount,
        message: `${timeString} ${!give ? '±0円' : amount > 0 ? `${amount}円GET!` : `${Math.abs(amount)}円没収`}`,
      },
    })
  ]);

  revalidatePath('/inagawa');

  return {
    timeString,
    amount,
    message,
    isRepdigit: give ? isRepdigit : false,
    gaveAllowance: give
  };
}

export async function getInagawaLeaderboard() {
  const users = await prisma.inagawa.findMany({
    include: {
      user: {
        select: {
          username: true,
          avatarUrl: true,
        }
      }
    },
    orderBy: {
      balance: 'desc',
    },
    take: 50,
  });

  return users;
}

export async function getInagawaHistory() {
  const session = await getSession();
  if (!session?.id) return [];

  const history = await prisma.inagawaHistory.findMany({
    where: { userId: session.id },
    orderBy: { timestamp: 'desc' },
    take: 100,
  });

  return history;
}
