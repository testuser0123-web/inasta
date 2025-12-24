"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import { Spinner } from "@/components/ui/spinner";
import { Play, Pause, Scissors, Upload } from "lucide-react";

interface VideoEditorProps {
  file: File;
  onCancel: () => void;
  onComplete: (file: File) => void;
}

export default function VideoEditor({ file, onCancel, onComplete }: VideoEditorProps) {
  const [loaded, setLoaded] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  const ffmpegRef = useRef<FFmpeg>(new FFmpeg());
  const videoRef = useRef<HTMLVideoElement>(null);

  const load = async () => {
    const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
    const ffmpeg = ffmpegRef.current;

    ffmpeg.on("log", ({ message }) => {
      console.log(message);
    });

    ffmpeg.on("progress", ({ progress }) => {
        setProgress(Math.round(progress * 100));
    });

    try {
      // Check if already loaded
      if (!ffmpeg.loaded) {
          await ffmpeg.load({
            coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
            wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
          });
      }
      setLoaded(true);
    } catch (e) {
      console.error("Failed to load ffmpeg", e);
    }
  };

  useEffect(() => {
    load();
    // Create URL for preview
    const url = URL.createObjectURL(file);
    setVideoUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  const handleLoadedMetadata = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const dur = e.currentTarget.duration;
    setDuration(dur);
    setEndTime(dur);
  };

  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    setCurrentTime(e.currentTarget.currentTime);
    // Loop preview within selected range
    if (e.currentTarget.currentTime > endTime) {
        e.currentTarget.currentTime = startTime;
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTrim = async () => {
    if (!loaded) return;
    setProcessing(true);
    const ffmpeg = ffmpegRef.current;
    const inputName = "input.mp4";
    const outputName = "output.mp4";

    try {
      await ffmpeg.writeFile(inputName, await fetchFile(file));

      // -ss = start time, -t = duration (end - start)
      // -c copy is fast but might be inaccurate for keyframes.
      // Re-encoding ensures accuracy but is slower. Let's try fast first or re-encode?
      // Re-encoding is safer for browser compatibility.
      // Command: ffmpeg -i input.mp4 -ss <start> -to <end> -c:v libx264 -c:a aac output.mp4
      // Note: ffmpeg.wasm usually supports libx264.

      // Duration calculation
      // const duration = endTime - startTime;

      await ffmpeg.exec([
        "-i", inputName,
        "-ss", startTime.toString(),
        "-to", endTime.toString(),
        "-c:v", "copy", // Try copy first for speed
        "-c:a", "copy",
        outputName
      ]);

      // If copy fails or gives weird results, we might need re-encoding.
      // But for now let's stick to copy for speed in browser.

      const data = await ffmpeg.readFile(outputName);
      const blob = new Blob([data], { type: "video/mp4" });
      const newFile = new File([blob], "trimmed.mp4", { type: "video/mp4" });

      onComplete(newFile);

    } catch (e) {
      console.error("Trimming failed", e);
      alert("Trimming failed. See console for details.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-black text-white p-4 gap-4">
      <div className="relative flex-1 flex items-center justify-center bg-zinc-900 rounded-lg overflow-hidden">
        {!loaded ? (
          <div className="flex flex-col items-center gap-2">
            <Spinner className="w-8 h-8 text-white" />
            <p className="text-sm text-gray-400">Loading video editor...</p>
          </div>
        ) : (
          <>
             {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video
              ref={videoRef}
              src={videoUrl || ""}
              className="max-h-full max-w-full"
              onLoadedMetadata={handleLoadedMetadata}
              onTimeUpdate={handleTimeUpdate}
              onEnded={() => setIsPlaying(false)}
            />
            {processing && (
                <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-10">
                    <Spinner className="w-10 h-10 text-white mb-4" />
                    <p className="text-white font-medium">Processing...</p>
                    {progress > 0 && <p className="text-gray-400 text-sm mt-2">{progress}%</p>}
                </div>
            )}
          </>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex justify-between text-sm text-gray-400">
          <span>{startTime.toFixed(1)}s</span>
          <span>{currentTime.toFixed(1)}s</span>
          <span>{endTime.toFixed(1)}s</span>
        </div>

        {/* Simple Range Sliders for Start/End */}
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <label className="w-12 text-xs">Start</label>
                <input
                    type="range"
                    min={0}
                    max={duration}
                    step={0.1}
                    value={startTime}
                    onChange={(e) => {
                        const val = Number(e.target.value);
                        if (val < endTime) {
                            setStartTime(val);
                            if (videoRef.current) videoRef.current.currentTime = val;
                        }
                    }}
                    className="flex-1"
                />
            </div>
            <div className="flex items-center gap-2">
                <label className="w-12 text-xs">End</label>
                <input
                    type="range"
                    min={0}
                    max={duration}
                    step={0.1}
                    value={endTime}
                    onChange={(e) => {
                        const val = Number(e.target.value);
                        if (val > startTime) setEndTime(val);
                    }}
                    className="flex-1"
                />
            </div>
        </div>

        <div className="flex items-center justify-between mt-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-400 hover:text-white"
            disabled={processing}
          >
            Cancel
          </button>

          <div className="flex gap-4">
             <button
                onClick={togglePlay}
                className="p-2 rounded-full bg-zinc-800 hover:bg-zinc-700"
                disabled={processing}
             >
                 {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
             </button>
             <button
                onClick={handleTrim}
                className="flex items-center gap-2 px-6 py-2 bg-indigo-600 rounded-full font-semibold hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={processing || !loaded}
             >
                <Scissors className="w-4 h-4" />
                <span>Trim & Next</span>
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}
