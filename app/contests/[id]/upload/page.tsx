'use client';

import { useActionState, useState, useRef, useCallback, useEffect } from "react";
import { createContestPost } from "@/app/actions/contest";
import { Camera, Check, X, Smartphone, Image as ImageIcon } from "lucide-react";
import Cropper from "react-easy-crop";
import { getCroppedImg } from "@/lib/image";
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Area = { x: number; y: number; width: number; height: number };
type AspectRatio = "1:1" | "original";

import { use } from "react";

export default function ContestUploadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: contestId } = use(params);
  const [state, action, isPending] = useActionState(createContestPost, undefined);
  const router = useRouter();

  useEffect(() => {
      if (state?.success) {
          router.push(`/contests/${contestId}`);
      }
  }, [state, contestId, router]);

  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [croppedImages, setCroppedImages] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("1:1");
  const [imageAspectRatio, setImageAspectRatio] = useState<number>(1);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const onCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.addEventListener("load", () => {
      setImageSrc(reader.result as string);
      const img = new Image();
      img.onload = () => setImageAspectRatio(img.width / img.height);
      img.src = reader.result as string;
    });
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleCropConfirm = useCallback(async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    try {
      let outputWidth = 512;
      let outputHeight = 512;

      if (aspectRatio === "original") {
        const width = croppedAreaPixels.width;
        const height = croppedAreaPixels.height;
        const aspect = width / height;

        if (width > height) {
          outputWidth = 512;
          outputHeight = Math.round(512 / aspect);
        } else {
          outputHeight = 512;
          outputWidth = Math.round(512 * aspect);
        }
      }

      const cropped = await getCroppedImg(
        imageSrc,
        croppedAreaPixels,
        { width: outputWidth, height: outputHeight }
      );

      if (cropped) setCroppedImages(prev => [...prev, cropped]);
      setImageSrc(null);
      setZoom(1);
    } catch (e) {
      console.error(e);
    }
  }, [imageSrc, croppedAreaPixels, aspectRatio]);

  const cancelCrop = () => {
    setImageSrc(null);
    setZoom(1);
  };

  const removeImage = (index: number) => {
      setCroppedImages(prev => prev.filter((_, i) => i !== index));
  };

  if (imageSrc) {
    return (
      <div className="flex flex-col h-screen bg-black">
        <div className="p-4 bg-white border-b flex flex-col gap-4 z-10">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <label className="text-xs text-gray-500 mb-1 block">ズーム</label>
              <input type="range" value={zoom} min={1} max={3} step={0.1} onChange={(e) => setZoom(Number(e.target.value))} className="w-full" />
            </div>
            <div className="flex items-center gap-2">
              <button onClick={cancelCrop} className="p-2"><X className="w-6 h-6" /></button>
              <button onClick={handleCropConfirm} className="px-4 py-2 bg-indigo-600 text-white rounded-md"><Check className="w-5 h-5" /></button>
            </div>
          </div>
          <div className="flex justify-center gap-4">
            <button type="button" onClick={() => setAspectRatio("1:1")} className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1 border ${aspectRatio === "1:1" ? "bg-black text-white" : "bg-white text-gray-700"}`}><Smartphone className="w-3 h-3" /> 正方形</button>
            <button type="button" onClick={() => setAspectRatio("original")} className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1 border ${aspectRatio === "original" ? "bg-black text-white" : "bg-white text-gray-700"}`}><ImageIcon className="w-3 h-3" /> 元の比率</button>
          </div>
        </div>
        <div className="relative flex-1 bg-black w-full">
          <Cropper image={imageSrc} crop={crop} zoom={zoom} aspect={aspectRatio === "1:1" ? 1 : imageAspectRatio} onCropChange={setCrop} onCropComplete={onCropComplete} onZoomChange={setZoom} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black">
        <div className="border-b dark:border-gray-800 px-4 py-3 flex items-center gap-4 shadow-sm">
            <Link href={`/contests/${contestId}`} className="text-gray-700 dark:text-gray-300 hover:text-black">
                <ArrowLeft className="w-6 h-6" />
            </Link>
            <h1 className="text-lg font-semibold dark:text-white">エントリー</h1>
        </div>

        <form action={action} className="space-y-6 w-full max-w-md mx-auto p-4">
            <input type="hidden" name="imageUrls" value={JSON.stringify(croppedImages)} />
            <input type="hidden" name="contestId" value={contestId} />

            {croppedImages.length > 0 ? (
                <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-200 group w-full max-w-sm mx-auto">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={croppedImages[0]} alt="" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => setCroppedImages([])} className="absolute top-2 right-2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"><X className="w-5 h-5" /></button>
                </div>
            ) : (
                <div onClick={() => fileInputRef.current?.click()} className="w-full h-64 bg-gray-100 dark:bg-gray-800 rounded-lg flex flex-col items-center justify-center cursor-pointer border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-gray-400">
                    <div className="text-gray-400 flex flex-col items-center">
                        <Camera className="w-12 h-12 mb-2" />
                        <span className="text-lg">画像を選択</span>
                    </div>
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                </div>
            )}

            <div>
                <label htmlFor="comment" className="block text-sm font-medium text-gray-700 dark:text-gray-300">コメント</label>
                <input type="text" name="comment" value={comment} onChange={(e) => setComment(e.target.value)} maxLength={200} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border" placeholder="エントリーの説明..." />
            </div>

            {state?.message && <div className="text-red-500 text-sm text-center">{typeof state.message === 'string' ? state.message : 'エラーが発生しました'}</div>}

            <button type="submit" disabled={isPending || croppedImages.length === 0} className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:opacity-50 font-bold">
                {isPending ? "投稿中..." : "投稿する"}
            </button>
        </form>
    </div>
  );
}
