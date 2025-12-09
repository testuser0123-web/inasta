import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const resolvedParams = await params;
  const username = resolvedParams.username;

  if (!username) {
    return new NextResponse('Username required', { status: 400 });
  }

  try {
    const user = await db.user.findUnique({
      where: { username },
      select: { avatarUrl: true },
    });

    if (!user || !user.avatarUrl) {
      return new NextResponse('Not Found', { status: 404 });
    }

    const avatarUrl = user.avatarUrl;

    // Check if it's a Data URI
    if (!avatarUrl.startsWith('data:')) {
        // If it's a normal URL (e.g. from future S3 integration), just redirect
        return NextResponse.redirect(avatarUrl);
    }

    const commaIndex = avatarUrl.indexOf(',');
    if (commaIndex === -1) {
        return new NextResponse('Invalid Image Data', { status: 500 });
    }

    const meta = avatarUrl.substring(5, commaIndex); // e.g. "image/jpeg;base64"
    const base64Data = avatarUrl.substring(commaIndex + 1);

    // Extract mime type (e.g. "image/jpeg")
    const mimeType = meta.split(';')[0];

    const buffer = Buffer.from(base64Data, 'base64');

    const response = new NextResponse(buffer, {
      headers: {
        'Content-Type': mimeType,
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, immutable',
        'CDN-Cache-Control': 'public, max-age=31536000, s-maxage=31536000, immutable',
      },
    });

    response.headers.set('Vary', 'Accept-Encoding');

    return response;

  } catch (error) {
      console.error('Error serving avatar:', error);
      return new NextResponse('Internal Server Error', { status: 500 });
  }
}
