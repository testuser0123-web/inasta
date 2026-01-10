import UploadForm from '@/components/UploadForm';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>

export default async function UploadPage(props: {
  searchParams: SearchParams
}) {
  const searchParams = await props.searchParams;

  const title = typeof searchParams.title === 'string' ? searchParams.title : '';
  const text = typeof searchParams.text === 'string' ? searchParams.text : '';
  const url = typeof searchParams.url === 'string' ? searchParams.url : '';

  // Combine params for initial comment, filtering out duplicates somewhat by joining with space
  const parts = [title, text, url].filter(Boolean);
  // Remove strict duplicates
  const uniqueParts = Array.from(new Set(parts));
  const initialComment = uniqueParts.join(' ');

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="border-b dark:border-gray-800 px-4 py-3 flex items-center justify-between relative shadow-sm bg-background text-foreground">
        <Link href="/" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-lg font-semibold">New Post</h1>
        <div className="w-6" /> {/* Spacer for symmetry */}
      </div>
      <UploadForm initialComment={initialComment} />
    </div>
  );
}
