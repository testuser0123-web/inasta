import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const id = parseInt(resolvedParams.id, 10);
  if (isNaN(id)) {
    return new NextResponse('Invalid ID', { status: 400 });
  }

  const post = await db.post.findUnique({
    where: { id },
    select: { imageUrl: true },
  });

  if (!post) {
    return new NextResponse('Not Found', { status: 404 });
  }

  // Parse Data URI
  // Format: data:image/jpeg;base64,...
  const matches = post.imageUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);

  if (!matches || matches.length !== 3) {
      return new NextResponse('Invalid Image Data', { status: 500 });
  }

  const type = matches[1];
  const buffer = Buffer.from(matches[2], 'base64');

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': type,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
