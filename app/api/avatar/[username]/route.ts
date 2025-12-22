import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;

  try {
    const user = await db.user.findUnique({
      where: { username },
      select: { avatarUrl: true, updatedAt: true },
    });

    if (!user || !user.avatarUrl) {
      // Default avatar or 404
      return new NextResponse("Not Found", { status: 404 });
    }

    // ETag logic based on updatedAt
    const etag = `"${user.updatedAt.getTime().toString()}"`;
    const ifNoneMatch = request.headers.get("if-none-match");

    if (ifNoneMatch === etag) {
      return new NextResponse(null, {
        status: 304,
        headers: {
            "ETag": etag,
            "Cache-Control": "public, max-age=60, stale-while-revalidate=600",
        }
      });
    }

    const headers = {
        "ETag": etag,
        "Cache-Control": "public, max-age=60, stale-while-revalidate=600",
    };

    // New logic: If it's a Supabase URL (starts with http), redirect to it.
    if (user.avatarUrl.startsWith('http')) {
        return NextResponse.redirect(user.avatarUrl, {
            headers
        });
    }

    // Legacy logic: If it's base64 (starts with data:), serve it.
    if (user.avatarUrl.startsWith("data:")) {
      const commaIndex = user.avatarUrl.indexOf(',');
      const base64Data = user.avatarUrl.substring(commaIndex + 1);
      const buffer = Buffer.from(base64Data, "base64");

      return new NextResponse(buffer, {
        headers: {
          "Content-Type": "image/jpeg", // Assume jpeg for legacy
          ...headers
        },
      });
    }

    // Fallback for other formats (redirect)
    return NextResponse.redirect(user.avatarUrl, {
        headers
    });

  } catch (error) {
    console.error("Error fetching avatar:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
