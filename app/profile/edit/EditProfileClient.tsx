'use client';

import { useRouter } from 'next/navigation';
import EditProfileForm from '@/components/EditProfileForm';

type User = {
    username: string;
    avatarUrl: string | null;
};

export default function EditProfileClient({ user }: { user: User }) {
  const router = useRouter();

  const handleClose = () => {
    router.push('/profile');
  };

  return <EditProfileForm user={user} onClose={handleClose} />;
}
