import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

function getAvatarCacheControl(request: NextRequest): string {
  const hasVersion = request.nextUrl.searchParams.has("v");

  if (hasVersion) {
    return "public, max-age=31536000, s-maxage=31536000, immutable";
  }

  return "public, max-age=60, s-maxage=600, stale-while-revalidate=600";
}

function getCommonAvatarHeaders(etag: string, cacheControl: string) {
  return {
    "ETag": etag,
    "Cache-Control": cacheControl,
    "Cross-Origin-Resource-Policy": "cross-origin",
    "Access-Control-Allow-Origin": "*",
  };
}

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
      return new NextResponse("Not Found", { status: 404 });
    }

    const etag = `"${user.updatedAt.getTime().toString()}"`;
    const cacheControl = getAvatarCacheControl(request);
    const headers = getCommonAvatarHeaders(etag, cacheControl);
    const ifNoneMatch = request.headers.get("if-none-match");

    if (ifNoneMatch === etag) {
      return new NextResponse(null, {
        status: 304,
        headers,
      });
    }

    if (user.avatarUrl.startsWith("http://") || user.avatarUrl.startsWith("https://")) {
      const response = await fetch(user.avatarUrl, {
        cache: "force-cache",
        next: request.nextUrl.searchParams.has("v")
          ? { revalidate: 31536000 }
          : { revalidate: 600 },
      });

      if (!response.ok) {
        return new NextResponse("Error fetching avatar", { status: response.status });
      }

      const contentType = response.headers.get("content-type") || "application/octet-stream";

      return new NextResponse(response.body, {
        headers: {
          "Content-Type": contentType,
          ...headers,
        },
      });
    }

    if (user.avatarUrl.startsWith("data:")) {
      const [metadata, base64Data] = user.avatarUrl.split(",", 2);
      if (!metadata || !base64Data || !metadata.includes(";base64")) {
        return new NextResponse("Invalid Avatar Format", { status: 500 });
      }

      const contentType = metadata.slice("data:".length).replace(";base64", "") || "image/jpeg";
      const buffer = Buffer.from(base64Data, "base64");

      return new NextResponse(buffer, {
        headers: {
          "Content-Type": contentType,
          ...headers,
        },
      });
    }

    return new NextResponse("Invalid Avatar Format", { status: 500 });
  } catch (error) {
    console.error("Error fetching avatar:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
