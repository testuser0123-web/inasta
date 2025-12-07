'use client';

import { useActionState, useState, useRef, useEffect, useCallback } from 'react';
import { updateProfile } from '@/app/actions/user';
import { Camera, Check, X } from 'lucide-react';
import Cropper from 'react-easy-crop';
import { getCroppedImg } from '@/lib/image';

type User = {
    username: string;
    avatarUrl: string | null;
};

type Area = { x: number; y: number; width: number; height: number };

export default function EditProfileForm({ user, onClose }: { user: User, onClose: () => void }) {
  const [state, action, isPending] = useActionState(updateProfile, undefined);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user.avatarUrl);
  const [username, setUsername] = useState(user.username);
  
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
      if (state?.success) {
          onClose();
      }
  }, [state, onClose]);

  const onCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.addEventListener('load', () => {
        setImageSrc(reader.result as string);
    });
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const applyCrop = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    try {
        const croppedImage = await getCroppedImg(
            imageSrc,
            croppedAreaPixels,
            128 // Output size for avatar
        );
        setAvatarPreview(croppedImage);
        setImageSrc(null); // Close cropper
    } catch (e) {
        console.error(e);
    }
  };

  const cancelCrop = () => {
      setImageSrc(null);
  };

  // If in cropping mode
  if (imageSrc) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
            <div className="w-full max-w-md h-[500px] flex flex-col relative bg-black">
                 <div className="relative flex-1 w-full bg-black">
                    <Cropper
                        image={imageSrc}
                        crop={crop}
                        zoom={zoom}
                        aspect={1}
                        cropShape="round" // Round crop guide for avatar
                        showGrid={false}
                        onCropChange={setCrop}
                        onCropComplete={onCropComplete}
                        onZoomChange={setZoom}
                    />
                </div>
                 <div className="p-4 flex items-center justify-between gap-4 bg-white/10 backdrop-blur-sm absolute bottom-0 w-full">
                     <div className="flex-1">
                         <input
                            type="range"
                            value={zoom}
                            min={1}
                            max={3}
                            step={0.1}
                            onChange={(e) => setZoom(Number(e.target.value))}
                            className="w-full h-1 bg-gray-500 rounded-lg appearance-none cursor-pointer"
                        />
                     </div>
                     <div className="flex items-center gap-4">
                         <button onClick={cancelCrop} className="text-white hover:text-gray-300">
                             <X className="w-6 h-6" />
                         </button>
                         <button onClick={applyCrop} className="text-white hover:text-gray-300">
                             <Check className="w-6 h-6" />
                         </button>
                     </div>
                 </div>
            </div>
        </div>
      );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-white rounded-lg w-full max-w-sm p-6 relative">
        <button 
            onClick={onClose}
            className="absolute top-2 right-2 p-1 text-gray-500 hover:text-black"
        >
            <X className="w-6 h-6" />
        </button>

        <h2 className="text-xl font-bold mb-6 text-center">Edit Profile</h2>

        <form action={action} className="space-y-6">
            <input type="hidden" name="avatarUrl" value={avatarPreview || ''} />

            <div className="flex flex-col items-center">
                <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-24 h-24 rounded-full bg-gray-200 overflow-hidden cursor-pointer relative group border-2 border-transparent hover:border-indigo-500 transition-colors"
                >
                    {avatarPreview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                         <div className="w-full h-full flex items-center justify-center text-gray-400">
                             <Camera className="w-8 h-8" />
                         </div>
                    )}
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                         <Camera className="w-6 h-6 text-white" />
                    </div>
                </div>
                <input 
                    ref={fileInputRef}
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleFileChange} 
                />
                <p className="text-xs text-gray-500 mt-2">Tap to change photo</p>
            </div>

            <div className="space-y-2">
                <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                    Username
                </label>
                <input
                    type="text"
                    id="username"
                    name="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 px-3"
                />
            </div>

            {state?.message && (
                <div className={`text-sm text-center ${state.success ? 'text-green-600' : 'text-red-500'}`}>
                    {state.message}
                </div>
            )}

            <button
                type="submit"
                disabled={isPending}
                className="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50"
            >
                {isPending ? 'Saving...' : 'Save Changes'}
            </button>
        </form>
      </div>
    </div>
  );
}