import UploadForm from '@/components/UploadForm';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import React from 'react';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { canUseFrame } from '@/lib/user_logic';

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function UploadPage(props: Props) {
  const searchParams = await props.searchParams;
  const session = await getSession();

  let frameEligible = false;
  if (session) {
    const user = await db.user.findUnique({
      where: { id: session.id },
      select: { subscriptionAmount: true, subscriptionExpiresAt: true },
    });
    if (user) {
      frameEligible = canUseFrame(user);
    }
  }

  const title = searchParams.title as string | undefined;
  const text = searchParams.text as string | undefined;
  let url = searchParams.url as string | undefined;

  // If URL is missing, try to extract it from text
  if (!url && text) {
      const urlRegex = /(https?:\/\/[^\s]+)/;
      const match = text.match(urlRegex);
      if (match) {
          url = match[0];
      }
  }

  // Construct initial comment
  // Logic: Join text and URL with a space
  const parts: string[] = [];
  if (text) parts.push(text);
  if (url && (!text || !text.includes(url))) parts.push(url);

  const initialComment = parts.join(" ");
  const initialHashtags = url ? "#NowPlaying" : "";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="border-b dark:border-gray-800 px-4 py-3 flex items-center justify-between relative shadow-sm bg-background text-foreground">
        <Link href="/" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-lg font-semibold">New Post</h1>
        <div className="w-6" /> {/* Spacer for symmetry */}
      </div>
      <UploadForm
        initialComment={initialComment}
        initialHashtags={initialHashtags}
        initialUrl={url}
        canUseFrame={frameEligible}
      />
    </div>
  );
}
