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

  const CACHE_CONTROL = 'public, max-age=31536000, s-maxage=31536000, immutable';

  try {
    const post = await db.contestPost.findUnique({
      where: { id },
      select: { imageUrl: true },
    });

    if (!post) {
      return new NextResponse('Not Found', { status: 404 });
    }

    const imageUrl = post.imageUrl;

    // Check if it's a Supabase URL
    if (imageUrl.startsWith('http')) {
        return NextResponse.redirect(imageUrl, {
            headers: {
                'Cache-Control': CACHE_CONTROL
            }
        });
    }

    // Check if it's a Data URI
    if (!imageUrl.startsWith('data:')) {
        // If it's not a Data URI, it might be an external URL (Blob).
        if (imageUrl.startsWith('http')) {
             return NextResponse.redirect(imageUrl, {
                headers: {
                    'Cache-Control': CACHE_CONTROL
                }
             });
        }
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
        'Cache-Control': CACHE_CONTROL,
        'CDN-Cache-Control': CACHE_CONTROL,
        'Vary': 'Accept-Encoding',
      },
    });

    return response;

  } catch (error) {
      console.error('Error serving contest image:', error);
      return new NextResponse('Internal Server Error', { status: 500 });
  }
}
