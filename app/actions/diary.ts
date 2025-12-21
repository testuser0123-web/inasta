'use server';

import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth'; // Using correct auth import
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { put } from '@vercel/blob';

const diarySchema = z.object({
  title: z.string().min(1, 'タイトルは必須です').max(100, 'タイトルが長すぎます'),
  content: z.any(), // JSON content from Lexical
  thumbnailUrl: z.string().nullish(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日付の形式が正しくありません'),
});

export async function createDiary(formData: FormData) {
  const session = await getSession();
  if (!session) {
    throw new Error('ログインが必要です');
  }

  const thumbnailFile = formData.get('thumbnailFile') as File;
  let thumbnailUrl = formData.get('thumbnailUrl') as string | undefined;

  if (thumbnailFile && thumbnailFile.size > 0) {
     const blob = await put(`diary-thumbnail/${session.id}/${Date.now()}-${thumbnailFile.name}`, thumbnailFile, {
        access: 'public',
        token: process.env.BLOB_READ_WRITE_TOKEN
     });
     thumbnailUrl = blob.url;
  }

  const rawData = {
    title: formData.get('title'),
    content: JSON.parse(formData.get('content') as string),
    thumbnailUrl,
    date: formData.get('date'),
  };

  const validatedFields = diarySchema.safeParse(rawData);

  if (!validatedFields.success) {
    throw new Error('入力内容に誤りがあります');
  }

  const { title, content, date } = validatedFields.data;
  const targetDate = new Date(date);

  // Check if user already posted for this date
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  const existingDiary = await db.diary.findFirst({
    where: {
      userId: session.id,
      date: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  });

  if (existingDiary) {
    if (!existingDiary.isDraft) {
      throw new Error('この日付の日記は既に投稿されています');
    }
    // Update draft to published
    await db.diary.update({
      where: { id: existingDiary.id },
      data: {
        title,
        content,
        thumbnailUrl: thumbnailUrl ?? existingDiary.thumbnailUrl, // Keep existing thumbnail if not updated
        isDraft: false, // Publish it
      },
    });
  } else {
    // Create new published diary
    await db.diary.create({
      data: {
        title,
        content,
        thumbnailUrl,
        date: targetDate,
        userId: session.id,
        isDraft: false,
      },
    });
  }

  revalidatePath('/diary');
  revalidatePath(`/profile`);
  redirect('/diary?date=' + date);
}

export async function saveDraft(formData: FormData) {
  const session = await getSession();
  if (!session) {
    throw new Error('ログインが必要です');
  }

  // We don't process thumbnail for drafts automatically unless provided (or maybe we skip thumbnail for draft?)
  // But user might upload thumbnail.
  // For simplicity, handle thumbnail same way if provided.
  const thumbnailFile = formData.get('thumbnailFile') as File;
  let thumbnailUrl = formData.get('thumbnailUrl') as string | undefined;

  if (thumbnailFile && thumbnailFile.size > 0) {
     const blob = await put(`diary-thumbnail/${session.id}/${Date.now()}-${thumbnailFile.name}`, thumbnailFile, {
        access: 'public',
        token: process.env.BLOB_READ_WRITE_TOKEN
     });
     thumbnailUrl = blob.url;
  }

  const rawData = {
    title: formData.get('title') || '', // Allow empty title for draft
    content: JSON.parse(formData.get('content') as string),
    thumbnailUrl,
    date: formData.get('date'),
  };

  // Custom validation for draft (looser)
  const dateStr = rawData.date as string;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    throw new Error('日付の形式が正しくありません');
  }

  const targetDate = new Date(dateStr);
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  const existingDiary = await db.diary.findFirst({
    where: {
      userId: session.id,
      date: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  });

  if (existingDiary) {
    if (!existingDiary.isDraft) {
      // Cannot overwrite published diary with draft
      return { success: false, message: '既に投稿済みです' };
    }
    // Update existing draft
    await db.diary.update({
      where: { id: existingDiary.id },
      data: {
        title: rawData.title,
        content: rawData.content,
        thumbnailUrl: thumbnailUrl ?? existingDiary.thumbnailUrl,
        isDraft: true,
      },
    });
  } else {
    // Create new draft
    await db.diary.create({
      data: {
        title: rawData.title,
        content: rawData.content,
        thumbnailUrl,
        date: targetDate,
        userId: session.id,
        isDraft: true,
      },
    });
  }

  return { success: true };
}

export async function getDraft(dateStr: string) {
  const session = await getSession();
  if (!session) return null;

  const targetDate = new Date(dateStr);
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  const draft = await db.diary.findFirst({
    where: {
      userId: session.id,
      date: {
        gte: startOfDay,
        lte: endOfDay,
      },
      isDraft: true,
    },
    select: {
      title: true,
      content: true,
      thumbnailUrl: true,
    }
  });

  return draft;
}

export async function getDiariesForRange(dateStr: string) {
  const targetDate = new Date(dateStr);
  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  // 3 days before target date
  const startOfRange = new Date(targetDate);
  startOfRange.setDate(startOfRange.getDate() - 3);
  startOfRange.setHours(0, 0, 0, 0);

  const diaries = await db.diary.findMany({
    where: {
      date: {
        gte: startOfRange,
        lte: endOfDay,
      },
      isDraft: false, // Exclude drafts
    },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          avatarUrl: true,
          isVerified: true,
          isGold: true,
        },
      },
      _count: {
        select: {
          likes: true,
          comments: true,
        },
      },
    },
    orderBy: {
      date: 'desc', // Sort by date descending
    },
  });

  return diaries;
}

export async function getPostedDiaryDates() {
  // Return a list of YYYY-MM-DD strings that have diaries
  const entries = await db.diary.findMany({
    where: {
        isDraft: false
    },
    select: {
      date: true
    },
    distinct: ['date'],
    orderBy: {
      date: 'desc'
    }
  });

  // Convert dates to YYYY-MM-DD strings
  const dates = entries.map(entry => {
    return entry.date.toISOString().split('T')[0];
  });

  return Array.from(new Set(dates));
}

export async function getDiariesByDate(dateStr: string) {
  const date = new Date(dateStr);
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const diaries = await db.diary.findMany({
    where: {
      date: {
        gte: startOfDay,
        lte: endOfDay,
      },
      isDraft: false, // Exclude drafts
    },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          avatarUrl: true,
          isVerified: true,
          isGold: true,
        },
      },
      _count: {
        select: {
          likes: true,
          comments: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return diaries;
}

export async function checkHasPostedToday(userId: number, dateStr: string) {
  const date = new Date(dateStr);
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const count = await db.diary.count({
    where: {
      userId,
      date: {
        gte: startOfDay,
        lte: endOfDay,
      },
      isDraft: false, // Only count published posts
    },
  });

  return count > 0;
}

export async function getDiaryById(id: number) {
  const diary = await db.diary.findUnique({
    where: { id },
    include: {
      user: true,
      likes: true,
      comments: {
        include: {
          user: true,
        },
        orderBy: {
          createdAt: 'asc',
        }
      },
      _count: {
        select: {
          likes: true,
          comments: true,
        },
      },
    },
  });

  // If it's a draft, maybe we shouldn't return it via getDiaryById unless it's the owner?
  // But getDiaryById is likely used for public viewing.
  // For now, if it's draft, maybe return null or let the caller handle it.
  // Given the existing usage, preventing draft leak is good.
  if (diary?.isDraft) {
      // Check if session user is owner, but we can't easily do that here without session.
      // But getDiaryById is generally for public consumption.
      // Let's assume drafts are not viewable by ID publicly.
      // However, the owner might want to preview it?
      // For now, let's filter drafts out for general access, or handle ownership check if we had session.
      // Since this is a server action, we can get session.
      const session = await getSession();
      if (session?.id !== diary.userId) {
          return null; // Hide draft from others
      }
  }

  return diary;
}

export async function uploadDiaryImage(formData: FormData) {
  const session = await getSession();
  if (!session) return { error: 'Unauthorized' };

  const file = formData.get('file') as File;
  if (!file) return { error: 'No file provided' };

  const blob = await put(`diary/${session.id}/${Date.now()}-${file.name}`, file, {
    access: 'public',
    token: process.env.BLOB_READ_WRITE_TOKEN
  });

  return { url: blob.url };
}

export async function toggleDiaryLike(diaryId: number) {
  const session = await getSession();
  if (!session) throw new Error('Unauthorized');

  const existingLike = await db.diaryLike.findUnique({
    where: {
      userId_diaryId: {
        userId: session.id,
        diaryId,
      },
    },
  });

  if (existingLike) {
    await db.diaryLike.delete({
      where: { id: existingLike.id },
    });
  } else {
    await db.diaryLike.create({
      data: {
        userId: session.id,
        diaryId,
      },
    });
  }
  revalidatePath(`/diary/${diaryId}`);
}

export async function addDiaryComment(diaryId: number, text: string) {
  const session = await getSession();
  if (!session) throw new Error('Unauthorized');

  await db.diaryComment.create({
    data: {
      text,
      userId: session.id,
      diaryId,
    },
  });
  revalidatePath(`/diary/${diaryId}`);
}

export async function getDiariesByUser(userId: number) {
  const diaries = await db.diary.findMany({
    where: {
        userId,
        isDraft: false // Exclude drafts
    },
    include: {
      user: true,
      _count: {
        select: { likes: true, comments: true }
      }
    },
    orderBy: { date: 'desc' }
  });
  return diaries;
}
