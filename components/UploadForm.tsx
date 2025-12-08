"use client";

import { useActionState, useState, useRef, useCallback } from "react";
import { createPost } from "@/app/actions/post";
import { Camera, Check, X, Smartphone, Image as ImageIcon } from "lucide-react";
import Cropper from "react-easy-crop";
import { getCroppedImg } from "@/lib/image";

type Area = { x: number; y: number; width: number; height: number };
type AspectRatio = "1:1" | "original";

export default function UploadForm() {
  const [state, action, isPending] = useActionState(createPost, undefined);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("1:1");
  const [imageAspectRatio, setImageAspectRatio] = useState<number>(1);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const onCropComplete = useCallback(
    (croppedArea: Area, croppedAreaPixels: Area) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    []
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.addEventListener("load", () => {
      setImageSrc(reader.result as string);
      setCroppedImage(null); // Reset cropped image to start cropping mode

      // Load image to get dimensions
      const img = new Image();
      img.onload = () => {
        setImageAspectRatio(img.width / img.height);
      };
      img.src = reader.result as string;
    });
    reader.readAsDataURL(file);
    // Reset file input value so same file can be selected again if needed
    e.target.value = "";
  };

  const showCroppedImage = useCallback(async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    try {
      let outputWidth = 512;
      let outputHeight = 512;

      if (aspectRatio === "original") {
        // Calculate dimensions such that long side is 512px
        const width = croppedAreaPixels.width;
        const height = croppedAreaPixels.height;
        const aspect = width / height;

        if (width > height) {
          // Landscape
          outputWidth = 512;
          outputHeight = Math.round(512 / aspect);
        } else {
          // Portrait
          outputHeight = 512;
          outputWidth = Math.round(512 * aspect);
        }
      }

      const croppedImage = await getCroppedImg(
        imageSrc,
        croppedAreaPixels,
        outputWidth,
        outputHeight
      );
      setCroppedImage(croppedImage);
    } catch (e) {
      console.error(e);
    }
  }, [imageSrc, croppedAreaPixels, aspectRatio]);

  const cancelCrop = () => {
    setImageSrc(null);
    setCroppedImage(null);
  };

  // If we have an image source but no cropped image yet, show Cropper
  if (imageSrc && !croppedImage) {
    return (
      <div className="flex flex-col h-[calc(100vh-100px)]">
        <div className="p-4 bg-white border-b flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
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

          <div className="flex justify-center gap-4">
            <button
              type="button"
              onClick={() => setAspectRatio("1:1")}
              className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1 border ${
                aspectRatio === "1:1"
                  ? "bg-black text-white border-black"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              }`}
            >
              <Smartphone className="w-3 h-3" />
              Square (1:1)
            </button>
            <button
              type="button"
              onClick={() => setAspectRatio("original")}
              className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1 border ${
                aspectRatio === "original"
                  ? "bg-black text-white border-black"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              }`}
            >
              <ImageIcon className="w-3 h-3" />
              Original
            </button>
          </div>
        </div>
        <div className="relative flex-1 bg-black w-full">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspectRatio === "1:1" ? 1 : imageAspectRatio}
            onCropChange={setCrop}
            onCropComplete={onCropComplete}
            onZoomChange={setZoom}
          />
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-6 w-full max-w-md mx-auto p-4">
      <input type="hidden" name="imageUrl" value={croppedImage || ""} />

      {croppedImage ? (
        <div
          className={`w-full bg-gray-100 rounded-lg relative overflow-hidden border border-gray-200 group ${
            aspectRatio === "1:1" ? "aspect-square" : ""
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={croppedImage}
            alt="Preview"
            className="w-full h-auto object-contain"
          />
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
        <label
          htmlFor="comment"
          className="block text-sm font-medium text-gray-700"
        >
          Comment
        </label>
        <div className="relative">
          <input
            type="text"
            id="comment"
            name="comment"
            maxLength={200}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            disabled={!croppedImage}
            className="block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 px-3 pr-12 disabled:bg-gray-100 disabled:text-gray-400"
            placeholder="Write a caption..."
          />
          <span className="absolute right-3 top-1.5 text-xs text-gray-400">
            {comment.length}/200
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
        {isPending ? "Uploading..." : "Share"}
      </button>
    </form>
  );
}
