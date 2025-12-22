'use server';

import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { supabaseAdmin, BUCKET_NAME } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

const diarySchema = z.object({
  title: z.string().min(1, 'タイトルは必須です').max(100, 'タイトルが長すぎます'),
  content: z.any(), // JSON content from Lexical
  thumbnailUrl: z.string().nullish(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日付の形式が正しくありません'),
});

// Helper function to upload file to Supabase Storage
async function uploadToSupabase(file: File, userId: string, folder: string): Promise<string> {
  const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '');
  const path = `${folder}/${userId}/${uuidv4()}-${cleanFileName}`;

  const arrayBuffer = await file.arrayBuffer();

  const { error } = await supabaseAdmin
    .storage
    .from(BUCKET_NAME)
    .upload(path, arrayBuffer, {
      contentType: file.type,
      upsert: false
    });

  if (error) {
    console.error('Supabase upload error:', error);
    throw new Error('Upload failed');
  }

  const { data } = supabaseAdmin
    .storage
    .from(BUCKET_NAME)
    .getPublicUrl(path);

  return data.publicUrl;
}

export async function createDiary(formData: FormData) {
  const session = await getSession();
  if (!session) {
    throw new Error('ログインが必要です');
  }

  // Check for thumbnailUrl first (Supabase)
  let thumbnailUrl = formData.get('thumbnailUrl') as string | undefined;

  if (!thumbnailUrl) {
    const thumbnailFile = formData.get('thumbnailFile') as File;
    if (thumbnailFile && thumbnailFile.size > 0) {
       thumbnailUrl = await uploadToSupabase(thumbnailFile, session.id.toString(), 'diary-thumbnail');
    }
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
        thumbnailUrl: thumbnailUrl ?? existingDiary.thumbnailUrl,
        date: targetDate,
        isDraft: false,
      },
    });
  } else {
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
      isDraft: false,
    },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          avatarUrl: true,
          isVerified: true,
          isGold: true,
          updatedAt: true,
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

  return diaries.map((diary) => ({
    ...diary,
    user: {
      ...diary.user,
      avatarUrl: diary.user.avatarUrl
        ? diary.user.avatarUrl.startsWith('http')
          ? diary.user.avatarUrl
          : `/api/avatar/${diary.user.username}?v=${diary.user.updatedAt.getTime()}`
        : null,
      updatedAt: undefined,
    },
  }));
}

export async function getPostedDiaryDates() {
  // Return a list of YYYY-MM-DD strings that have diaries
  const entries = await db.diary.findMany({
    where: {
      isDraft: false,
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
  // Using toISOString().split('T')[0] works if dates are stored as UTC midnight
  const dates = entries.map(entry => {
    // Ensure we handle the date correctly.
    // If stored as Date, it might have time components or be UTC.
    // Assuming standard storage from createDiary which uses new Date(string).
    return entry.date.toISOString().split('T')[0];
  });

  // Deduplicate just in case time variations exist (though distinct should handle it if exact match)
  return Array.from(new Set(dates));
}

// Keeping original function for backward compatibility if needed, or we can remove it.
// The page uses it, but we will update the page.
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
      isDraft: false,
    },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          avatarUrl: true,
          isVerified: true,
          isGold: true,
          updatedAt: true,
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

  return diaries.map((diary) => ({
    ...diary,
    user: {
      ...diary.user,
      avatarUrl: diary.user.avatarUrl
        ? diary.user.avatarUrl.startsWith('http')
          ? diary.user.avatarUrl
          : `/api/avatar/${diary.user.username}?v=${diary.user.updatedAt.getTime()}`
        : null,
      updatedAt: undefined,
    },
  }));
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
      isDraft: false,
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
  if (!diary) return null;

  return {
    ...diary,
    user: {
      ...diary.user,
      avatarUrl: diary.user.avatarUrl
        ? diary.user.avatarUrl.startsWith('http')
          ? diary.user.avatarUrl
          : `/api/avatar/${diary.user.username}?v=${diary.user.updatedAt.getTime()}`
        : null,
    },
    comments: diary.comments.map((comment) => ({
      ...comment,
      user: {
        ...comment.user,
        avatarUrl: comment.user.avatarUrl
          ? comment.user.avatarUrl.startsWith('http')
            ? comment.user.avatarUrl
            : `/api/avatar/${comment.user.username}?v=${comment.user.updatedAt.getTime()}`
          : null,
      },
    })),
  };
}

export async function uploadDiaryImage(formData: FormData) {
  const session = await getSession();
  if (!session) return { error: 'Unauthorized' };

  const file = formData.get('file') as File;
  if (!file) return { error: 'No file provided' };

  const url = await uploadToSupabase(file, session.id.toString(), 'diary');

  return { url };
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
    where: { userId, isDraft: false },
    include: {
      user: true,
      _count: {
        select: { likes: true, comments: true }
      }
    },
    orderBy: { date: 'desc' }
  });

  return diaries.map((diary) => ({
    ...diary,
    user: {
      ...diary.user,
      avatarUrl: diary.user.avatarUrl
        ? diary.user.avatarUrl.startsWith('http')
          ? diary.user.avatarUrl
          : `/api/avatar/${diary.user.username}?v=${diary.user.updatedAt.getTime()}`
        : null,
    },
  }));
}

export async function saveDraft(formData: FormData) {
  const session = await getSession();
  if (!session) {
    throw new Error('ログインが必要です');
  }

  // Same logic as createDiary for thumbnail
  let thumbnailUrl = formData.get('thumbnailUrl') as string | undefined;

  if (!thumbnailUrl) {
    const thumbnailFile = formData.get('thumbnailFile') as File;
    if (thumbnailFile && thumbnailFile.size > 0) {
       thumbnailUrl = await uploadToSupabase(thumbnailFile, session.id.toString(), 'diary-thumbnail');
    }
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
    // If it's a draft, update it
    if (existingDiary.isDraft) {
      await db.diary.update({
        where: { id: existingDiary.id },
        data: {
          title,
          content,
          // Only update thumbnail if a new one is provided or if we want to explicitly clear it (which we don't here)
          // If thumbnailUrl is null/undefined, keep existing
          thumbnailUrl: thumbnailUrl ?? existingDiary.thumbnailUrl,
          date: targetDate,
          isDraft: true,
        },
      });
      return { id: existingDiary.id, saved: true };
    }
    // If published, do nothing (or throw error if strictly draft)
    // We'll just return success false to indicate no draft saved because published exists
    return { id: existingDiary.id, saved: false, message: 'Already published' };
  } else {
    const newDiary = await db.diary.create({
      data: {
        title,
        content,
        thumbnailUrl,
        date: targetDate,
        userId: session.id,
        isDraft: true,
      },
    });
    return { id: newDiary.id, saved: true };
  }
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
  });

  return draft;
}
