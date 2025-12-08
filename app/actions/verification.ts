'use server';

import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { randomBytes } from 'crypto';

const BBS_URL = 'https://jbbs.shitaraba.net/bbs/rawmode.cgi/anime/11224/1738931824/l10';

export async function generateVerificationToken() {
  const session = await getSession();
  if (!session) return { message: 'Unauthorized', success: false };

  const token = randomBytes(16).toString('hex');

  await db.user.update({
    where: { id: session.id },
    data: { verificationToken: token },
  });

  return { token, success: true };
}

export async function verifyAccount(bbsName: string) {
  const session = await getSession();
  if (!session) return { message: 'Unauthorized', success: false };

  const user = await db.user.findUnique({
    where: { id: session.id },
    select: { verificationToken: true },
  });

  if (!user || !user.verificationToken) {
    return { message: 'No verification token found. Please start over.', success: false };
  }

  try {
    const response = await fetch(BBS_URL, { cache: 'no-store' });
    if (!response.ok) {
      return { message: 'Failed to fetch BBS logs.', success: false };
    }

    // Shitaraba rawmode returns EUC-JP usually, but node-fetch might handle it as buffer.
    // However, recent fetch implementations might try to decode.
    // Let's assume text first, but we might need to handle encoding if characters get garbled.
    // Since we are looking for a hex token (ascii) and standard trip names,
    // simple text decoding often works for the specific parts we care about unless the name itself is complex kanji.
    // Note: `◆` symbol might be encoding dependent.
    
    // For robustness with Japanese text in fetch environments:
    const buffer = await response.arrayBuffer();
    const decoder = new TextDecoder('euc-jp'); // Shitaraba is typically EUC-JP
    const text = decoder.decode(buffer);

    // Format we look for: Name field matches "◆" + bbsName
    // Rawmode format is usually: 
    // resNum<>name<>mail<>date/id<>body<>title<>
    // Example: 1<>名無しさん<>sage<>2023/01/01(Sun) 00:00:00 ID:abc<>Testing<>Title<>
    
    // We search for a line where:
    // 1. Name is "◆" + bbsName
    // 2. Body contains verificationToken

    const lines = text.split('\n');
    const targetName = `◆${bbsName}`;
    const token = user.verificationToken;

    const found = lines.some(line => {
      const parts = line.split('<>');
      if (parts.length < 5) return false;
      
      const name = parts[1];
      const body = parts[4];
      
      return name === targetName && body.includes(token);
    });

    if (found) {
      await db.user.update({
        where: { id: session.id },
        data: { 
            isVerified: true,
            verificationToken: null // Clear token
        },
      });
      return { message: 'Account verified successfully!', success: true };
    } else {
      return { message: 'Verification post not found. Please make sure you used the correct name (◆' + bbsName + ') and included the token.', success: false };
    }

  } catch (error) {
    console.error('Verification error:', error);
    return { message: 'An error occurred during verification.', success: false };
  }
}
