import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const postIdParam = request.nextUrl.searchParams.get("postId");
  const postId = postIdParam ? Number.parseInt(postIdParam, 10) : Number.NaN;

  if (!Number.isInteger(postId) || postId <= 0) {
    return NextResponse.json({ error: "Invalid postId" }, { status: 400 });
  }

  try {
    const comments = await db.comment.findMany({
      where: { postId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        text: true,
        userId: true,
        user: {
          select: {
            username: true,
            avatarUrl: true,
            updatedAt: true,
          },
        },
      },
    });

    return NextResponse.json(
      comments.map((comment) => ({
        id: comment.id,
        text: comment.text,
        userId: comment.userId,
        user: {
          username: comment.user.username,
          avatarUrl: comment.user.avatarUrl
            ? comment.user.avatarUrl.startsWith("http")
              ? comment.user.avatarUrl
              : `/api/avatar/${comment.user.username}?v=${comment.user.updatedAt.getTime()}`
            : null,
        },
      })),
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Failed to fetch post comments:", error);
    return NextResponse.json({ error: "Failed to fetch comments" }, { status: 500 });
  }
}
