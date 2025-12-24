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

    const headers = {
      "Cross-Origin-Resource-Policy": "cross-origin",
      "Access-Control-Allow-Origin": "*",
    };

    if (!user || !user.avatarUrl) {
      // Default avatar or 404
      return new NextResponse("Not Found", { status: 404, headers });
    }

    const etag = `"${user.updatedAt.getTime().toString()}"`;
    const ifNoneMatch = request.headers.get("if-none-match");

    if (ifNoneMatch === etag) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          "ETag": etag,
          "Cache-Control": "public, max-age=60, stale-while-revalidate=600",
          ...headers,
        }
      });
    }

    const successHeaders = {
        "ETag": etag,
        "Cache-Control": "public, max-age=60, stale-while-revalidate=600",
        ...headers,
    };

    // Proxy Supabase/Cloudinary URLs
    if (user.avatarUrl.startsWith('http')) {
        const response = await fetch(user.avatarUrl);
        if (!response.ok) {
             return new NextResponse('Error fetching avatar', { status: response.status, headers });
        }
        const contentType = response.headers.get('content-type') || 'application/octet-stream';
        const buffer = await response.arrayBuffer();

        return new NextResponse(buffer, {
            headers: {
                "Content-Type": contentType,
                ...successHeaders
            }
        });
    }

    // Legacy Data URI
    if (user.avatarUrl.startsWith("data:")) {
      const commaIndex = user.avatarUrl.indexOf(',');
      const base64Data = user.avatarUrl.substring(commaIndex + 1);
      const buffer = Buffer.from(base64Data, "base64");

      return new NextResponse(buffer, {
        headers: {
          "Content-Type": "image/jpeg",
          ...successHeaders
        },
      });
    }

    // Fallback Proxy (if path is weird but accessible?)
    // If it's not http and not data:, it might be invalid or relative?
    // Let's assume invalid for now, but keeping safe logic.
    return new NextResponse("Invalid Avatar Format", { status: 500, headers });

  } catch (error) {
    console.error("Error fetching avatar:", error);
    return new NextResponse("Internal Server Error", { status: 500, headers: { "Cross-Origin-Resource-Policy": "cross-origin" } });
  }
}
