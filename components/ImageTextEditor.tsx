"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { TextOverlay, addTextToImage } from "@/lib/image";
import {
  Type,
  RotateCw,
  Maximize,
  Palette,
  Check,
  X,
  Plus,
  Trash2,
  Move
} from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { v4 as uuidv4 } from "uuid";

interface ImageTextEditorProps {
  imageSrc: string;
  onCancel: () => void;
  onComplete: (newImageSrc: string) => void;
}

export default function ImageTextEditor({ imageSrc, onCancel, onComplete }: ImageTextEditorProps) {
  const [overlays, setOverlays] = useState<TextOverlay[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Dragging state
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOverlay = overlays.find((o) => o.id === selectedId);

  // Add new text
  const addText = () => {
    const newOverlay: TextOverlay = {
      id: uuidv4(),
      text: "Text",
      x: 0.5,
      y: 0.5,
      scale: 2, // Default scale
      rotation: 0,
      color: "#ffffff",
      outlineColor: "#000000",
    };
    setOverlays([...overlays, newOverlay]);
    setSelectedId(newOverlay.id);
  };

  const updateOverlay = (id: string, updates: Partial<TextOverlay>) => {
    setOverlays((prev) =>
      prev.map((o) => (o.id === id ? { ...o, ...updates } : o))
    );
  };

  const deleteOverlay = (id: string) => {
    setOverlays((prev) => prev.filter((o) => o.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  // Drag logic
  const handlePointerDown = (e: React.PointerEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedId(id);
    setIsDragging(true);

    const element = e.currentTarget as HTMLElement;
    element.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent, id: string) => {
    if (!isDragging || id !== selectedId || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();

    // Calculate new position based on pointer relative to container
    // We clamp to 0-1 range to keep inside image
    let newX = (e.clientX - rect.left) / rect.width;
    let newY = (e.clientY - rect.top) / rect.height;

    // Optional: Clamp? Or allow dragging off-screen?
    // Allowing slightly off screen is usually good, but let's clamp strictly for now or use 0-1.
    // Let's not strict clamp, allow partly off.

    updateOverlay(id, { x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    const element = e.currentTarget as HTMLElement;
    element.releasePointerCapture(e.pointerId);
  };

  const handleSave = async () => {
    setIsProcessing(true);
    try {
        // Wait a tick to ensure UI renders (though not strictly needed for logic)
        await new Promise(r => setTimeout(r, 0));

        const newImage = await addTextToImage(imageSrc, overlays);
        onComplete(newImage);
    } catch (error) {
        console.error("Failed to compose image", error);
        alert("Failed to save image. Please try again.");
        setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] bg-black">
      {/* Top Bar */}
      <div className="flex items-center justify-between p-4 bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 z-10">
        <button onClick={onCancel} className="p-2 text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white">
          <X className="w-6 h-6" />
        </button>
        <span className="font-semibold text-gray-900 dark:text-white">Edit Text</span>
        <button
            onClick={handleSave}
            disabled={isProcessing}
            className="p-2 text-indigo-600 font-bold disabled:opacity-50"
        >
            {isProcessing ? <Spinner className="w-5 h-5" /> : <Check className="w-6 h-6" />}
        </button>
      </div>

      {/* Editor Area */}
      <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-zinc-900">
        <div ref={containerRef} className="relative max-w-full max-h-full">
            {/* Base Image */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src={imageSrc}
                alt="Editing"
                className="max-w-full max-h-[calc(100vh-250px)] object-contain pointer-events-none select-none"
            />

            {/* Overlays */}
            {overlays.map((overlay) => (
                <div
                    key={overlay.id}
                    onPointerDown={(e) => handlePointerDown(e, overlay.id)}
                    onPointerMove={(e) => handlePointerMove(e, overlay.id)}
                    onPointerUp={handlePointerUp}
                    className={`absolute cursor-move select-none whitespace-nowrap px-2 py-1 ${
                        selectedId === overlay.id ? "ring-2 ring-indigo-500 ring-offset-2 ring-offset-transparent" : ""
                    }`}
                    style={{
                        left: `${overlay.x * 100}%`,
                        top: `${overlay.y * 100}%`,
                        transform: `translate(-50%, -50%) rotate(${overlay.rotation}deg)`,
                        fontSize: `${overlay.scale}rem`, // Using rem as a scaling unit approximation
                        // Note: In real canvas we use pixel size.
                        // Visual scaling in CSS needs to somewhat match the canvas logic.
                        // In canvas logic: baseSize * scale.
                        // If baseSize ~ 24px, 1rem ~ 16px.
                        // So scale 1 in canvas (24px) should be ~1.5rem in CSS?
                        // Let's adjust CSS size to be visually similar.
                        // We'll trust the user to adjust the slider until it looks right.
                        color: overlay.color,
                        WebkitTextStroke: overlay.outlineColor && overlay.outlineColor !== 'transparent'
                            ? `${overlay.scale * 0.5}px ${overlay.outlineColor}` // approximate stroke width for CSS
                            : 'none',
                        // CSS text-stroke is non-standard but widely supported.
                        // Fallback implies shadow? Shadow looks different.
                        // textShadow can simulate stroke:
                        textShadow: overlay.outlineColor && overlay.outlineColor !== 'transparent'
                             ? `-1px -1px 0 ${overlay.outlineColor}, 1px -1px 0 ${overlay.outlineColor}, -1px 1px 0 ${overlay.outlineColor}, 1px 1px 0 ${overlay.outlineColor}`
                             : 'none',
                        fontFamily: 'sans-serif',
                        fontWeight: 'bold',
                        zIndex: selectedId === overlay.id ? 20 : 10,
                        touchAction: 'none' // Important for pointer events
                    }}
                >
                    {overlay.text}
                </div>
            ))}
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white dark:bg-zinc-900 p-4 border-t border-gray-200 dark:border-zinc-800 space-y-4 z-10">

        {/* Toolbar */}
        <div className="flex justify-center gap-6 mb-2">
            <button
                onClick={addText}
                className="flex flex-col items-center gap-1 text-xs text-gray-600 dark:text-gray-400"
            >
                <div className="p-2 bg-gray-100 dark:bg-zinc-800 rounded-full">
                    <Plus className="w-5 h-5" />
                </div>
                Add Text
            </button>

            {selectedId && (
                <button
                    onClick={() => deleteOverlay(selectedId)}
                    className="flex flex-col items-center gap-1 text-xs text-red-600"
                >
                    <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-full">
                        <Trash2 className="w-5 h-5" />
                    </div>
                    Delete
                </button>
            )}
        </div>

        {selectedOverlay ? (
            <div className="space-y-4 animate-in slide-in-from-bottom-5 duration-200">
                {/* Text Input */}
                <input
                    type="text"
                    value={selectedOverlay.text}
                    onChange={(e) => updateOverlay(selectedOverlay.id, { text: e.target.value })}
                    className="w-full bg-gray-100 dark:bg-zinc-800 border-none rounded-lg px-4 py-2 text-center font-bold focus:ring-2 focus:ring-indigo-500"
                    placeholder="Enter text..."
                />

                <div className="grid grid-cols-2 gap-4">
                    {/* Size Slider */}
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Maximize className="w-3 h-3" />
                            <span>Size</span>
                        </div>
                        <input
                            type="range"
                            min="0.5"
                            max="5"
                            step="0.1"
                            value={selectedOverlay.scale}
                            onChange={(e) => updateOverlay(selectedOverlay.id, { scale: parseFloat(e.target.value) })}
                            className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                    </div>

                    {/* Rotation Slider */}
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                            <RotateCw className="w-3 h-3" />
                            <span>Rotate</span>
                        </div>
                        <input
                            type="range"
                            min="-180"
                            max="180"
                            step="1"
                            value={selectedOverlay.rotation}
                            onChange={(e) => updateOverlay(selectedOverlay.id, { rotation: parseInt(e.target.value) })}
                            className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                    </div>
                </div>

                {/* Colors */}
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2 flex-1">
                        <span className="text-xs text-gray-500 w-12">Color</span>
                        <input
                            type="color"
                            value={selectedOverlay.color}
                            onChange={(e) => updateOverlay(selectedOverlay.id, { color: e.target.value })}
                            className="h-8 w-full rounded cursor-pointer bg-transparent"
                        />
                    </div>
                    <div className="flex items-center gap-2 flex-1">
                        <span className="text-xs text-gray-500 w-12">Outline</span>
                        <input
                            type="color"
                            value={selectedOverlay.outlineColor}
                            onChange={(e) => updateOverlay(selectedOverlay.id, { outlineColor: e.target.value })}
                            className="h-8 w-full rounded cursor-pointer bg-transparent"
                        />
                    </div>
                </div>
            </div>
        ) : (
            <div className="text-center text-sm text-gray-500 py-4">
                Select text to edit or add new text
            </div>
        )}
      </div>
    </div>
  );
}
