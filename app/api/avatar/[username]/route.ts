
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
      select: { avatarUrl: true },
    });

    if (!user || !user.avatarUrl) {
      // Return default avatar (e.g. initial or placeholder)
      // For now, redirect to a default or 404.
      // Or return a generated SVG.
      // Let's redirect to a default generic avatar if possible, or 404.
      return new NextResponse("Not Found", { status: 404 });
    }

    // New logic: If it's a Supabase URL (starts with http), redirect to it.
    if (user.avatarUrl.startsWith('http')) {
        return NextResponse.redirect(user.avatarUrl);
    }

    // Legacy logic: If it's base64 (starts with data:), serve it.
    if (user.avatarUrl.startsWith("data:")) {
      const base64Data = user.avatarUrl.split(",")[1];
      const buffer = Buffer.from(base64Data, "base64");

      return new NextResponse(buffer, {
        headers: {
          "Content-Type": "image/jpeg", // Assume jpeg for legacy
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }

    // If it's something else (e.g. relative path?), try redirecting?
    // Assuming it's a valid URL string otherwise.
    return NextResponse.redirect(user.avatarUrl);

  } catch (error) {
    console.error("Error fetching avatar:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
