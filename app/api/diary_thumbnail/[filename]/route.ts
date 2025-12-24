import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const resolvedParams = await params;
  const idStr = resolvedParams.filename.split('.')[0];
  const id = parseInt(idStr, 10);

  if (isNaN(id)) {
    return new NextResponse('Invalid ID', { status: 400 });
  }

  const CACHE_CONTROL = 'public, max-age=31536000, s-maxage=31536000, immutable';

  try {
    const diary = await db.diary.findUnique({
      where: { id },
      select: { thumbnailUrl: true },
    });

    if (!diary || !diary.thumbnailUrl) {
      return new NextResponse('Not Found', { status: 404 });
    }

    const imageUrl = diary.thumbnailUrl;

    // Proxy URL (http/https)
    if (imageUrl.startsWith('http')) {
        const response = await fetch(imageUrl);
        if (!response.ok) {
            return new NextResponse('Error fetching image', { status: response.status });
        }

        const contentType = response.headers.get('content-type') || 'application/octet-stream';
        const buffer = await response.arrayBuffer();

        // Ensure we forward relevant headers or set them correctly
        return new NextResponse(buffer, {
            headers: {
                'Content-Type': contentType,
                'Content-Length': buffer.byteLength.toString(),
                'Cache-Control': CACHE_CONTROL,
                'Cross-Origin-Resource-Policy': 'cross-origin',
                'Access-Control-Allow-Origin': '*', // Adding explicit CORS
            }
        });
    }

    // Proxy relative URL (e.g. Supabase new uploads starting with /api/diary_image)
    if (imageUrl.startsWith('/api/')) {
        // Construct absolute URL for internal fetch
        // Assuming localhost:3000 for internal fetch is risky in production environments (like Vercel)
        // without knowing the domain.
        // However, we can just "forward" it if we knew the host.
        // But better: if it's /api/diary_image/[...path], we can invoke the logic directly or fetch via absolute URL.
        // Since we are in an API route, fetching another API route via HTTP is inefficient.
        // BUT, for now, let's treat it as a fetch if we can resolve the host.
        // Or better, let's just handle it.
        // Wait, if imageUrl is `/api/diary_image/...`, and we are in `GET`,
        // The browser can fetch it directly!
        // Why do we proxy it? Because `getDiariesForRange` rewrites it to `/api/diary_thumbnail/...`.
        // If we want to serve it here, we need to fetch it.

        const protocol = request.headers.get('x-forwarded-proto') || 'http';
        const host = request.headers.get('host') || 'localhost:3000';
        const absoluteUrl = `${protocol}://${host}${imageUrl}`;

        const response = await fetch(absoluteUrl);
        if (!response.ok) {
             return new NextResponse('Error fetching local image', { status: response.status });
        }
        const contentType = response.headers.get('content-type') || 'application/octet-stream';
        const buffer = await response.arrayBuffer();
         return new NextResponse(buffer, {
            headers: {
                'Content-Type': contentType,
                'Content-Length': buffer.byteLength.toString(),
                'Cache-Control': CACHE_CONTROL,
                'Cross-Origin-Resource-Policy': 'cross-origin',
                'Access-Control-Allow-Origin': '*',
            }
        });
    }

    // Check if it's a Data URI
    if (!imageUrl.startsWith('data:')) {
         return new NextResponse('Invalid Image Format', { status: 500 });
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
