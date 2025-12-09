import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const resolvedParams = await params;
  // Parse ID from filename (e.g. "123.jpg" -> "123")
  const idStr = resolvedParams.filename.split('.')[0];
  const id = parseInt(idStr, 10);

  if (isNaN(id)) {
    return new NextResponse('Invalid ID', { status: 400 });
  }

  try {
    const postImage = await db.postImage.findUnique({
      where: { id },
      select: { url: true },
    });

    if (!postImage) {
      return new NextResponse('Not Found', { status: 404 });
    }

    const imageUrl = postImage.url;

    // Check if it's a Data URI
    if (!imageUrl.startsWith('data:')) {
        return new NextResponse('Invalid Image Format', { status: 500 });
    }

    const commaIndex = imageUrl.indexOf(',');
    if (commaIndex === -1) {
        return new NextResponse('Invalid Image Data', { status: 500 });
    }

    const meta = imageUrl.substring(5, commaIndex); // e.g. "image/jpeg;base64"
    const base64Data = imageUrl.substring(commaIndex + 1);

    // Extract mime type (e.g. "image/jpeg")
    const mimeType = meta.split(';')[0];

    const buffer = Buffer.from(base64Data, 'base64');

    const response = new NextResponse(buffer, {
      headers: {
        'Content-Type': mimeType,
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, immutable',
        'CDN-Cache-Control': 'public, max-age=31536000, s-maxage=31536000,immutable',
      },
    });

    response.headers.set('Vary', 'Accept-Encoding');

    return response;

  } catch (error) {
      console.error('Error serving post image:', error);
      return new NextResponse('Internal Server Error', { status: 500 });
  }
}
