import UploadForm from '@/components/UploadForm';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function UploadPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="border-b px-4 py-3 flex items-center justify-between relative shadow-sm">
        <Link href="/" className="text-gray-700 hover:text-black">
            <ArrowLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-lg font-semibold">New Post</h1>
        <div className="w-6" /> {/* Spacer for symmetry */}
      </div>
      <UploadForm />
    </div>
  );
}
