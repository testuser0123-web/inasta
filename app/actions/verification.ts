'use server';

import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { randomBytes } from 'crypto';

const BBS_URL = 'https://jbbs.shitaraba.net/bbs/rawmode.cgi/anime/11224/1738931824/l10';

export async function generateVerificationToken() {
  const session = await getSession();
  if (!session) return { message: '認証されていません', success: false };

  const token = randomBytes(16).toString('hex');

  await db.user.update({
    where: { id: session.id },
    data: { verificationToken: token },
  });

  return { token, success: true };
}

export async function verifyAccount(bbsName: string) {
  const session = await getSession();
  if (!session) return { message: '認証されていません', success: false };

  const user = await db.user.findUnique({
    where: { id: session.id },
    select: { verificationToken: true },
  });

  if (!user || !user.verificationToken) {
    return { message: '認証トークンが見つかりません。最初からやり直してください。', success: false };
  }

  try {
    const response = await fetch(BBS_URL, { cache: 'no-store' });
    if (!response.ok) {
      return { message: 'BBSログの取得に失敗しました。', success: false };
    }

    const buffer = await response.arrayBuffer();
    const decoder = new TextDecoder('euc-jp');
    const text = decoder.decode(buffer);

    const lines = text.split('\n');
    const targetTrip = `◆${bbsName}`;
    const token = user.verificationToken;

    const found = lines.some(line => {
      const parts = line.split('<>');
      if (parts.length < 5) return false;
      
      let name = parts[1];
      const body = parts[4];

      name = name.replace(/<[^>]+>/g, '');
      
      const nameMatch = name.includes(targetTrip);
      const tokenMatch = body.includes(token);
      
      return nameMatch && tokenMatch;
    });

    if (found) {
      await db.user.update({
        where: { id: session.id },
        data: { 
            isVerified: true,
            verificationToken: null
        },
      });
      return { message: 'アカウントが正常に認証されました！', success: true };
    } else {
      return { message: '認証投稿が見つかりません。正しい名前（◆' + bbsName + '）とトークンを使用していることを確認してください。', success: false };
    }

  } catch (error) {
    console.error('Verification error:', error);
    return { message: '認証中にエラーが発生しました。', success: false };
  }
}
