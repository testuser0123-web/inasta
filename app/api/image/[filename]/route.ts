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
    console.error('Invalid ID parsed from filename:', resolvedParams.filename);
    return new NextResponse('Invalid ID', { status: 400 });
  }

  try {
    const post = await db.post.findUnique({
      where: { id },
      select: { imageUrl: true },
    });

    if (!post) {
      console.error('Post not found for ID:', id);
      return new NextResponse('Not Found', { status: 404 });
    }

    const imageUrl = post.imageUrl;

    // Check if it's a Data URI
    if (!imageUrl.startsWith('data:')) {
        console.error('Image URL is not a Data URI for post:', id);
        return new NextResponse('Invalid Image Format', { status: 500 });
    }

    const commaIndex = imageUrl.indexOf(',');
    if (commaIndex === -1) {
        console.error('Invalid Data URI format (no comma) for post:', id);
        return new NextResponse('Invalid Image Data', { status: 500 });
    }

    const meta = imageUrl.substring(5, commaIndex); // e.g. "image/jpeg;base64"
    const base64Data = imageUrl.substring(commaIndex + 1);
    
    // Extract mime type (e.g. "image/jpeg")
    const mimeType = meta.split(';')[0];

    const buffer = Buffer.from(base64Data, 'base64');

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': mimeType,
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, immutable',
        'CDN-Cache-Control': 'public, max-age=31536000, s-maxage=31536000,immutable',
      },
    });

  } catch (error) {
      console.error('Error serving image:', error);
      return new NextResponse('Internal Server Error', { status: 500 });
  }
}
