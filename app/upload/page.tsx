import UploadForm from '@/components/UploadForm';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function UploadPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="border-b dark:border-gray-800 px-4 py-3 flex items-center justify-between relative shadow-sm bg-background text-foreground">
        <Link href="/" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-lg font-semibold">New Post</h1>
        <div className="w-6" /> {/* Spacer for symmetry */}
      </div>
      <UploadForm />
    </div>
  );
}
