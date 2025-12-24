"use client";

import { useActionState, useState, useRef, useCallback } from "react";
import { createPost } from "@/app/actions/post";
import { Camera, Check, X, Smartphone, Image as ImageIcon, Video, Loader2 } from "lucide-react";
import Cropper from "react-easy-crop";
import { getCroppedImg } from "@/lib/image";
import { uploadImageToSupabase } from "@/lib/client-upload";
import { Spinner } from "@/components/ui/spinner";
import VideoEditor from "@/components/VideoEditor";
import { useUI } from "@/components/providers/ui-provider";

type Area = { x: number; y: number; width: number; height: number };
type AspectRatio = "1:1" | "original";
type MediaType = "IMAGE" | "VIDEO";

export default function UploadForm() {
  const [state, action, isPending] = useActionState(createPost, undefined);
  const [mediaSrc, setMediaSrc] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<MediaType>("IMAGE");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [trimmedVideo, setTrimmedVideo] = useState<File | null>(null);

  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [croppedImages, setCroppedImages] = useState<string[]>([]);
  // Global UI state for isUploading
  const { isUploading, setIsUploading } = useUI();
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const [comment, setComment] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [isSpoiler, setIsSpoiler] = useState(false);
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

    if (file.type.startsWith("video/")) {
        setMediaType("VIDEO");
        setMediaFile(file);
        // Reset image state
        setCroppedImages([]);
        setImageSrc(null);
    } else {
        setMediaType("IMAGE");
        setMediaFile(null);
        setTrimmedVideo(null);

        const reader = new FileReader();
        reader.addEventListener("load", () => {
          setImageSrc(reader.result as string);

          // Load image to get dimensions
          const img = new Image();
          img.onload = () => {
            setImageAspectRatio(img.width / img.height);
          };
          img.src = reader.result as string;
        });
        reader.readAsDataURL(file);
    }
    // Reset file input value so same file can be selected again if needed
    e.target.value = "";
  };

  const setImageSrc = (src: string | null) => {
      setMediaSrc(src);
  };

  const handleCropConfirm = useCallback(async () => {
    if (!mediaSrc || !croppedAreaPixels) return;
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

      const cropped = await getCroppedImg(
        mediaSrc,
        croppedAreaPixels,
        { width: outputWidth, height: outputHeight }
      );

      if (cropped) {
          setCroppedImages(prev => [...prev, cropped]);
      }

      // Reset crop state
      setMediaSrc(null);
      setZoom(1);
    } catch (e) {
      console.error(e);
    }
  }, [mediaSrc, croppedAreaPixels, aspectRatio]);

  const cancelCrop = () => {
    setMediaSrc(null);
    setZoom(1);
  };

  const cancelVideo = () => {
      setMediaFile(null);
      setTrimmedVideo(null);
  }

  const handleVideoComplete = (file: File) => {
      setTrimmedVideo(file);
      setMediaFile(null); // Close editor
  }

  const removeImage = (index: number) => {
      setCroppedImages(prev => prev.filter((_, i) => i !== index));
  };

  const removeVideo = () => {
      setTrimmedVideo(null);
  }

  const handleSubmit = async (formData: FormData) => {
    setIsUploading(true);
    setUploadProgress("Preparing...");

    // Yield to UI to ensure overlay renders
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
      formData.set('mediaType', mediaType);

      if (mediaType === "IMAGE") {
          setUploadProgress("Uploading Images...");
          // Convert base64 cropped images to files and upload to Supabase
          const uploadPromises = croppedImages.map(async (base64, index) => {
            const res = await fetch(base64);
            const blob = await res.blob();
            const file = new File([blob], `image-${index}.jpg`, { type: 'image/jpeg' });
            return uploadImageToSupabase(file, 'posts');
          });

          const uploadedUrls = await Promise.all(uploadPromises);

          // Update FormData with the new URLs
          formData.set('imageUrls', JSON.stringify(uploadedUrls));

          if (uploadedUrls.length > 0) {
            formData.set('imageUrl', uploadedUrls[0]);
          }
      } else if (mediaType === "VIDEO" && trimmedVideo) {
          setUploadProgress("Uploading Video...");
          const cloudName = "dkpqkx7q6";
          const uploadPreset = "nanashi"; // Unsigned preset

          const videoData = new FormData();
          videoData.append("file", trimmedVideo);
          videoData.append("upload_preset", uploadPreset);
          videoData.append("cloud_name", cloudName);

          // Upload to Cloudinary
          const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/video/upload`, {
              method: "POST",
              body: videoData
          });

          if (!res.ok) {
              const errorData = await res.json();
              throw new Error(`Cloudinary upload failed: ${errorData.error?.message || res.statusText}`);
          }

          const data = await res.json();
          const videoUrl = data.secure_url;

          let thumbnailUrl = videoUrl.replace(/\.[^/.]+$/, ".jpg");

          formData.set('imageUrls', JSON.stringify([videoUrl])); // Use main URL slot for video
          formData.set('imageUrl', videoUrl);
          formData.set('thumbnailUrl', thumbnailUrl);
      }

      setUploadProgress("Finalizing Post...");
      // Call the Server Action
      await action(formData);

    } catch (error) {
      console.error("Upload failed", error);
      alert("Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
      setUploadProgress("");
    }
  };

  // Video Editor
  if (mediaType === "VIDEO" && mediaFile) {
      return (
          <VideoEditor
            file={mediaFile}
            onCancel={cancelVideo}
            onComplete={handleVideoComplete}
          />
      )
  }

  // Image Cropper
  if (mediaType === "IMAGE" && mediaSrc) {
    return (
      <div className="flex flex-col h-[calc(100vh-100px)]">
        <div className="p-4 bg-white dark:bg-zinc-900 border-b flex flex-col gap-4">
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
                className="p-2 text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
              <button
                onClick={handleCropConfirm}
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
                  ? "bg-black text-white border-black dark:bg-white dark:text-black"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50 dark:bg-zinc-800 dark:text-gray-300 dark:border-zinc-700"
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
                  ? "bg-black text-white border-black dark:bg-white dark:text-black"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50 dark:bg-zinc-800 dark:text-gray-300 dark:border-zinc-700"
              }`}
            >
              <ImageIcon className="w-3 h-3" />
              Original
            </button>
          </div>
        </div>
        <div className="relative flex-1 bg-black w-full">
          <Cropper
            image={mediaSrc}
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

  const hasMedia = croppedImages.length > 0 || !!trimmedVideo;

  return (
    <>
      {(isUploading || isPending) && (
        <div className="fixed inset-0 z-[9999] bg-black/70 flex flex-col items-center justify-center backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl flex flex-col items-center gap-4 shadow-xl">
            <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
            <div className="text-center">
              <p className="text-lg font-semibold text-gray-900 dark:text-white">Processing...</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {uploadProgress || "Please wait..."}
              </p>
            </div>
          </div>
        </div>
      )}

      <form action={handleSubmit} className="space-y-6 w-full max-w-md mx-auto p-4">

        {/* Grid of selected images or video preview */}
        {croppedImages.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
                {croppedImages.map((img, index) => (
                    <div key={index} className="relative aspect-square bg-gray-100 dark:bg-zinc-800 rounded-lg overflow-hidden border border-gray-200 dark:border-zinc-700 group">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img} alt={`Preview ${index}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>
        )}

        {trimmedVideo && (
            <div className="relative aspect-video bg-black rounded-lg overflow-hidden border border-gray-200 dark:border-zinc-700 group">
                {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                <video
                  src={URL.createObjectURL(trimmedVideo)}
                  className="w-full h-full object-contain"
                  controls
                />
                <button
                  type="button"
                  onClick={removeVideo}
                  className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
            </div>
        )}

        {/* Add Button */}
        {!hasMedia && (
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`w-full bg-gray-100 dark:bg-zinc-800 rounded-lg flex flex-col items-center justify-center cursor-pointer border-2 border-dashed border-gray-300 dark:border-zinc-700 hover:border-gray-400 dark:hover:border-zinc-600 relative overflow-hidden aspect-square`}
          >
            <div className="text-gray-400 flex flex-col items-center">
              <div className="flex gap-2 mb-2">
                  <Camera className="w-8 h-8" />
                  <Video className="w-8 h-8" />
              </div>
              <span>Tap to select image or video</span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        )}

        {/* Allow adding more images if in Image mode and less than 4 */}
        {mediaType === "IMAGE" && croppedImages.length > 0 && croppedImages.length < 4 && (
          <div
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-12 bg-gray-100 dark:bg-zinc-800 rounded-lg flex items-center justify-center cursor-pointer border-2 border-dashed border-gray-300 dark:border-zinc-700 hover:border-gray-400 dark:hover:border-zinc-600"
          >
              <div className="text-gray-400 flex items-center gap-2 text-sm">
                  <Camera className="w-4 h-4" />
                  <span>Add another image ({croppedImages.length}/4)</span>
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
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Comment
          </label>
          <div className="relative">
            <input
              type="text"
              id="comment"
              name="comment"
              maxLength={173}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              disabled={!hasMedia || isUploading || isPending}
              className="block w-full rounded-md border-0 py-1.5 text-gray-900 dark:text-white dark:bg-zinc-800 ring-1 ring-inset ring-gray-300 dark:ring-zinc-700 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 px-3 pr-12 disabled:bg-gray-100 disabled:text-gray-400 dark:disabled:bg-zinc-900 dark:disabled:text-zinc-600"
              placeholder="Write a caption..."
            />
            <span className="absolute right-3 top-1.5 text-xs text-gray-400">
              {comment.length}/173
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="hashtags"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            ハッシュタグ (任意, 最大3つ)
          </label>
          <div className="relative">
            <input
              type="text"
              id="hashtags"
              name="hashtags"
              value={hashtags}
              onChange={(e) => setHashtags(e.target.value)}
              disabled={!hasMedia || isUploading || isPending}
              className="block w-full rounded-md border-0 py-1.5 text-gray-900 dark:text-white dark:bg-zinc-800 ring-1 ring-inset ring-gray-300 dark:ring-zinc-700 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 px-3 disabled:bg-gray-100 disabled:text-gray-400 dark:disabled:bg-zinc-900 dark:disabled:text-zinc-600"
              placeholder="#travel #food #nature"
            />
          </div>
          <p className="text-xs text-gray-500">
            ハッシュタグはスペースで区切ってください。
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="isSpoiler"
            name="isSpoiler"
            checked={isSpoiler}
            onChange={(e) => setIsSpoiler(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
          />
          <label htmlFor="isSpoiler" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            ネタバレ注意 (画像を隠す)
          </label>
        </div>

        {state?.message && (
          <div className="text-red-500 text-sm text-center">{state.message}</div>
        )}

        <button
          type="submit"
          disabled={isPending || isUploading || !hasMedia}
          className="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 flex items-center gap-2"
        >
          {isUploading || isPending ? (
            <>
              <Spinner className="w-4 h-4 text-white" />
              <span>{isUploading ? "Processing..." : "Posting..."}</span>
            </>
          ) : (
            "Share"
          )}
        </button>
      </form>
    </>
  );
}
