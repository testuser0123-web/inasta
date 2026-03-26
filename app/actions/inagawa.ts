'use server';

import { db as prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

// Configuration
const INAGAWA_BASE_ALLOWANCE = 170;
const INAGAWA_REPDIGIT_PENALTY = -1000;
const INAGAWA_MINUS_31_PENALTY = -3000;
const INAGAWA_BONUS_17_ALLOWANCE = 1700;

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
    const historyAgg = await prisma.inagawaHistory.aggregate({
      where: { userId },
      _sum: { amount: true }
    });

    inagawa = await prisma.inagawa.create({
      data: {
        userId,
        balance: historyAgg._sum.amount || 0
      },
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

// Box-Muller transform to generate normally distributed random numbers
function randomNormal(mean: number, stdDev: number): number {
  let u = 1 - Math.random(); // Converting [0,1) to (0,1]
  let v = Math.random();
  let z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return z * stdDev + mean;
}

export async function giveAllowance(give: boolean = true, overrideCentiseconds?: string) {
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
  let centisecondsStr = String(centiseconds).padStart(2, '0');

  // Dev mode override
  if (process.env.NODE_ENV === 'development' && overrideCentiseconds && overrideCentiseconds.length === 2) {
    centisecondsStr = overrideCentiseconds;
  }

  const timeString = `${hours}:${minutes}:${seconds}.${centisecondsStr}`;

  const isRepdigit = centisecondsStr[0] === centisecondsStr[1];

  let amount = 0;
  if (give) {
    if (centisecondsStr === '31') {
      amount = INAGAWA_MINUS_31_PENALTY;
    } else if (centisecondsStr === '17') {
      amount = INAGAWA_BONUS_17_ALLOWANCE;
    } else if (isRepdigit) {
      amount = INAGAWA_REPDIGIT_PENALTY;
    } else {
      let rawAmount = Math.round(randomNormal(INAGAWA_BASE_ALLOWANCE, 3.3));
      // Clip between 160 and 180
      amount = Math.max(160, Math.min(180, rawAmount));
    }
  }

  const positiveMessages = [
    '(⌐■_■.)「ほらよ」',
    '(⌐■_■.)「やるよ」',
    'ᶘｲ^⇁^ﾅ川わーい！',
    'ᶘｲ^⇁^ﾅ川ありがとうございます！'
  ];

  const negativeMessages = [
    '(⌐■_■.)「ぞろ目だぞ没収だ」',
    '(⌐■_■.)「罰金だ、反省しろ」'
  ];

  const minus31Messages = [
    'ᶘｲ^⇁^ﾅ川ふぅ....',
    'jΣﾐｲ˶º ᴗº˶ﾘ♡'
  ];

  const bonus17Messages = [
    '(⌐■_■.)「特別だぞ」',
    '(⌐■_■.)「ボーナスだ」',
    'ᶘｲ^⇁^ﾅ川ボーナスです！'
  ];

  let message = '';
  if (!give) {
    message = 'ᶘｲ;⇁;ﾅ川「イナー」';
  } else if (centisecondsStr === '31') {
    message = minus31Messages[Math.floor(Math.random() * minus31Messages.length)];
  } else if (centisecondsStr === '17') {
    message = bonus17Messages[Math.floor(Math.random() * bonus17Messages.length)];
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
