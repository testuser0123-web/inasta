import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { list } from '@vercel/blob';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const resolvedParams = await params;
  const idStr = resolvedParams.filename.split('.')[0];
  const id = parseInt(idStr, 10);

  const headers = {
    'Cross-Origin-Resource-Policy': 'cross-origin',
  };

  if (isNaN(id)) {
    return new NextResponse('Invalid ID', { status: 400, headers });
  }

  const CACHE_CONTROL =
    'public, max-age=31536000, s-maxage=31536000, immutable';

  try {
    const diary = await db.diary.findUnique({
      where: { id },
      select: { thumbnailUrl: true },
    });

    if (!diary || !diary.thumbnailUrl) {
      return new NextResponse('Not Found', { status: 404, headers });
    }

    const imageUrl = diary.thumbnailUrl;

    // Proxy URL
    if (imageUrl.startsWith('http')) {
      let response: Response | null = null;
      try {
        response = await fetch(imageUrl);
      } catch (error) {
        console.error('Error fetching image from URL:', error);
      }

      if (!response || !response.ok) {
        try {
          // Fallback to Vercel Blob
          // Extract pathname (e.g. "diary-thumbnail/65/...") from the URL
          const urlObj = new URL(imageUrl);
          const pathname = urlObj.pathname.substring(1); // Remove leading slash

          const { blobs } = await list({
            prefix: pathname,
            limit: 1,
            token: process.env.BLOB_READ_WRITE_TOKEN,
          });

          if (blobs.length > 0) {
            response = await fetch(blobs[0].url, { cache: 'no-store' });
          }
        } catch (error) {
          console.error('Error fetching image from Vercel Blob:', error);
        }
      }

      if (!response || !response.ok) {
        return new NextResponse('Error fetching image', {
          status: response ? response.status : 404,
          headers,
        });
      }
      const contentType =
        response.headers.get('content-type') || 'application/octet-stream';
      const buffer = await response.arrayBuffer();

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': CACHE_CONTROL,
          ...headers,
        },
      });
    }

    // Check if it's a Data URI
    if (!imageUrl.startsWith('data:')) {
      return new NextResponse('Invalid Image Format', { status: 500, headers });
    }

    const commaIndex = imageUrl.indexOf(',');
    if (commaIndex === -1) {
        return new NextResponse('Invalid Image Data', { status: 500 });
    }

    const meta = imageUrl.substring(5, commaIndex);
    const base64Data = imageUrl.substring(commaIndex + 1);
    const mimeType = meta.split(';')[0];
    const buffer = Buffer.from(base64Data, 'base64');

    const response = new NextResponse(buffer, {
      headers: {
        'Content-Type': mimeType,
        'Content-Length': buffer.length.toString(),
        'Cache-Control': CACHE_CONTROL,
        'CDN-Cache-Control': CACHE_CONTROL,
        'Cross-Origin-Resource-Policy': 'cross-origin',
      },
    });

    return response;

  } catch (error) {
      console.error('Error serving diary thumbnail:', error);
      return new NextResponse('Internal Server Error', { status: 500 });
  }
}
