'use server';

import { db } from '@/lib/db';
import { encrypt } from '@/lib/auth';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { redirect } from 'next/navigation';

export async function signup(prevState: any, formData: FormData) {
  const username = formData.get('username') as string;
  const password = formData.get('password') as string;

  if (!username || !password) {
    return { message: 'Username and password are required' };
  }

  const existingUser = await db.user.findUnique({
    where: { username },
  });

  if (existingUser) {
    return { message: 'Username already taken' };
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await db.user.create({
    data: {
      username,
      password: hashedPassword,
    },
  });

  const session = await encrypt({ id: user.id, username: user.username });
  const cookieStore = await cookies();
  cookieStore.set('session', session, {
    httpOnly: true,
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  redirect('/');
}

export async function login(prevState: any, formData: FormData) {
  const username = formData.get('username') as string;
  const password = formData.get('password') as string;

  if (!username || !password) {
    return { message: 'Username and password are required' };
  }

  const user = await db.user.findUnique({
    where: { username },
  });

  if (!user) {
    return { message: 'Invalid credentials' };
  }

  const isValid = await bcrypt.compare(password, user.password);

  if (!isValid) {
    return { message: 'Invalid credentials' };
  }

  const session = await encrypt({ id: user.id, username: user.username });
  const cookieStore = await cookies();
  cookieStore.set('session', session, {
    httpOnly: true,
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  redirect('/');
}
