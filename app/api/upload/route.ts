import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        // Authenticate the user
        const session = await getSession();
        if (!session) {
          throw new Error('Unauthorized');
        }

        // Limit the file types and size
        // clientPayload can be used to pass metadata if needed
        return {
          allowedContentTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
          tokenPayload: JSON.stringify({
            userId: session.id,
            // optional payload
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // This is called via webhook after upload is complete.
        // We can use this to log or trigger other actions, but for now we trust the client to submit the URL.
        // If we wanted to be strictly secure, we would save the post here, but we need the form data (caption, etc.)
        // So we just log it.
        try {
            // const { userId } = JSON.parse(tokenPayload!);
            // console.log('Upload completed for user', userId, blob.url);
        } catch (e) {
            console.error(e);
        }
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }, // The webhook will retry 5 times automatically if the status code is 400+
    );
  }
}
