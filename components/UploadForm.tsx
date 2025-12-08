'use client';

import { useActionState, useState, useRef, useCallback } from 'react';
import { createPost } from '@/app/actions/post';
import { Camera, Check, X } from 'lucide-react';
import Cropper from 'react-easy-crop';
import { getCroppedImg } from '@/lib/image';

type Area = { x: number; y: number; width: number; height: number };

export default function UploadForm() {
  const [state, action, isPending] = useActionState(createPost, undefined);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.addEventListener('load', () => {
        setImageSrc(reader.result as string);
        setCroppedImage(null); // Reset cropped image to start cropping mode
    });
    reader.readAsDataURL(file);
    // Reset file input value so same file can be selected again if needed
    e.target.value = '';
  };

  const showCroppedImage = useCallback(async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    try {
      const croppedImage = await getCroppedImg(
        imageSrc,
        croppedAreaPixels,
        512 // Output size
      );
      setCroppedImage(croppedImage);
      // Don't clear imageSrc so we can go back?
      // For now, simple flow: Select -> Crop -> Review/Upload.
      // If they want to change crop, they currently have to re-select file or we can add "Back" button.
      // Let's add a "Back" or "Cancel" button in the crop view.
    } catch (e) {
      console.error(e);
    }
  }, [imageSrc, croppedAreaPixels]);

  const cancelCrop = () => {
      setImageSrc(null);
      setCroppedImage(null);
  };

  // If we have an image source but no cropped image yet, show Cropper
  if (imageSrc && !croppedImage) {
      return (
          <div className="flex flex-col h-[calc(100vh-100px)]">
              <div className="p-4 bg-white border-b flex items-center justify-between gap-4">
                 <div className="flex-1">
                     <label className="text-xs text-gray-500 mb-1 block">Zoom</label>
                     <input
                        type="range"
                        value={zoom}
                        min={1}
                        max={3}
                        step={0.1}
                        aria-labelledby="Zoom"
                        onChange={(e) => setZoom(Number(e.target.value))}
                        className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                 </div>
                 <div className="flex items-center gap-2">
                     <button
                        onClick={cancelCrop}
                        className="p-2 text-gray-500 hover:text-black"
                     >
                         <X className="w-6 h-6" />
                     </button>
                     <button
                        onClick={showCroppedImage}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-md font-semibold text-sm hover:bg-indigo-500"
                     >
                         <Check className="w-5 h-5" />
                     </button>
                 </div>
              </div>
              <div className="relative flex-1 bg-black w-full">
                <Cropper
                    image={imageSrc}
                    crop={crop}
                    zoom={zoom}
                    aspect={1}
                    onCropChange={setCrop}
                    onCropComplete={onCropComplete}
                    onZoomChange={setZoom}
                />
              </div>
          </div>
      )
  }

  return (
    <form action={action} className="space-y-6 w-full max-w-md mx-auto p-4">
       <input type="hidden" name="imageUrl" value={croppedImage || ''} />
      
      {croppedImage ? (
           <div className="aspect-square w-full bg-gray-100 rounded-lg relative overflow-hidden border border-gray-200 group">
               {/* eslint-disable-next-line @next/next/no-img-element */}
               <img src={croppedImage} alt="Preview" className="w-full h-full object-cover" />
               <button 
                type="button"
                onClick={cancelCrop}
                className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
               >
                   <X className="w-5 h-5" />
               </button>
           </div>
      ) : (
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="aspect-square w-full bg-gray-100 rounded-lg flex flex-col items-center justify-center cursor-pointer border-2 border-dashed border-gray-300 hover:border-gray-400 relative overflow-hidden"
          >
            <div className="text-gray-400 flex flex-col items-center">
                <Camera className="w-12 h-12 mb-2" />
                <span>Tap to select image</span>
            </div>
            <input 
              ref={fileInputRef}
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={handleFileChange} 
            />
          </div>
      )}

      <div className="space-y-2">
        <label htmlFor="comment" className="block text-sm font-medium text-gray-700">
          Comment
        </label>
        <div className="relative">
          <input
            type="text"
            id="comment"
            name="comment"
            maxLength={17}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            disabled={!croppedImage}
            className="block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 px-3 pr-12 disabled:bg-gray-100 disabled:text-gray-400"
            placeholder="Write a caption..."
          />
          <span className="absolute right-3 top-1.5 text-xs text-gray-400">
            {comment.length}/17
          </span>
        </div>
      </div>

      {state?.message && (
        <div className="text-red-500 text-sm text-center">{state.message}</div>
      )}

      <button
        type="submit"
        disabled={isPending || !croppedImage}
        className="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50"
      >
        {isPending ? 'Uploading...' : 'Share'}
      </button>
    </form>
  );
}