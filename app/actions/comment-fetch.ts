"use server";

import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function fetchPostComments(postId: number) {
  const session = await getSession(); // Session might not be strictly needed for reading comments, but good practice.

  const comments = await db.comment.findMany({
    where: { postId },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      text: true,
      userId: true,
      user: {
        select: {
          username: true,
          avatarUrl: true,
          updatedAt: true, // Needed for avatar versioning
        }
      }
    }
  });

  return comments.map(comment => ({
    ...comment,
    user: {
      ...comment.user,
      avatarUrl: comment.user.avatarUrl
        ? comment.user.avatarUrl.startsWith('http')
          ? comment.user.avatarUrl
          : `/api/avatar/${comment.user.username}?v=${comment.user.updatedAt.getTime()}`
        : null
    }
  }));
}
