import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, BUCKET_NAME } from '@/lib/supabase';

// Helper to determine content type from extension
function getContentType(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    case 'svg':
      return 'image/svg+xml';
    default:
      return 'application/octet-stream';
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  const pathArray = resolvedParams.path;

  const headers = {
    'Cross-Origin-Resource-Policy': 'cross-origin',
  };

  if (!pathArray || pathArray.length === 0) {
    return new NextResponse('Invalid Path', { status: 400, headers });
  }

  // Reconstruct path (e.g., diary/123/uuid.jpg)
  const filePath = pathArray.join('/');

  try {
    // Download file from Supabase Storage using Admin Client (Service Key)
    const { data, error } = await supabaseAdmin
      .storage
      .from(BUCKET_NAME)
      .download(filePath);

    if (error) {
      console.error('Error downloading from Supabase:', error);
      return new NextResponse('Not Found', { status: 404, headers });
    }

    if (!data) {
      return new NextResponse('Empty Data', { status: 500, headers });
    }

    const buffer = await data.arrayBuffer();
    const contentType = getContentType(filePath);

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        ...headers,
      },
    });
  } catch (error) {
    console.error('Error serving diary image:', error);
    return new NextResponse('Internal Server Error', { status: 500, headers });
  }
}
