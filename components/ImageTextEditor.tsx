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
import { HexColorPicker } from "react-colorful";

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
  const imageRef = useRef<HTMLImageElement>(null);
  const [imageWidth, setImageWidth] = useState<number>(0);

  // Measure image width for consistent font sizing
  useEffect(() => {
    if (!imageRef.current) return;
    const updateWidth = () => {
        if (imageRef.current) {
            setImageWidth(imageRef.current.clientWidth);
        }
    };

    // Initial measure
    updateWidth();

    // Use ResizeObserver to track size changes
    const resizeObserver = new ResizeObserver(() => {
        updateWidth();
    });

    resizeObserver.observe(imageRef.current);
    return () => resizeObserver.disconnect();
  }, [imageSrc]);

  const selectedOverlay = overlays.find((o) => o.id === selectedId);

  // Add new text
  const addText = () => {
    const newOverlay: TextOverlay = {
      id: uuidv4(),
      text: "テキスト",
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
        alert("画像の保存に失敗しました。もう一度お試しください。");
        setIsProcessing(false);
    }
  };

  // Helper for font size calculation in pixels
  const getFontSizePx = (scale: number) => {
      // Logic must match lib/image.ts: baseSize = image.width / 20
      if (!imageWidth) return 16; // Fallback
      return (imageWidth / 20) * scale;
  };

  const [activeColorPicker, setActiveColorPicker] = useState<'fill' | 'outline' | null>(null);

  // Close color picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
       // Simple global close for now if clicking outside the picker area
       // Note: This is simplified. In a real app we'd use refs to check containment.
    }
    // document.addEventListener('mousedown', handleClickOutside);
    // return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] bg-black">
      {/* Top Bar */}
      <div className="flex items-center justify-between p-4 bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 z-10">
        <button onClick={onCancel} className="p-2 text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white">
          <X className="w-6 h-6" />
        </button>
        <span className="font-semibold text-gray-900 dark:text-white">テキスト編集</span>
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
        <div ref={containerRef} className="relative max-w-full max-h-full inline-block">
            {/* Base Image */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                ref={imageRef}
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
                    className={`absolute cursor-move select-none whitespace-nowrap px-2 py-1 origin-center ${
                        selectedId === overlay.id ? "ring-2 ring-indigo-500 ring-offset-2 ring-offset-transparent" : ""
                    }`}
                    style={{
                        left: `${overlay.x * 100}%`,
                        top: `${overlay.y * 100}%`,
                        transform: `translate(-50%, -50%) rotate(${overlay.rotation}deg)`,
                        fontSize: `${getFontSizePx(overlay.scale)}px`,
                        color: overlay.color,
                        WebkitTextStroke: overlay.outlineColor && overlay.outlineColor !== 'transparent'
                            ? `${getFontSizePx(overlay.scale) * 0.1}px ${overlay.outlineColor}`
                            : 'none',
                        // Fallback text shadow for browsers that don't support text-stroke well or for smoother look
                        textShadow: overlay.outlineColor && overlay.outlineColor !== 'transparent'
                             ? `-1px -1px 0 ${overlay.outlineColor}, 1px -1px 0 ${overlay.outlineColor}, -1px 1px 0 ${overlay.outlineColor}, 1px 1px 0 ${overlay.outlineColor}`
                             : 'none',
                        fontFamily: 'sans-serif',
                        fontWeight: 'bold',
                        zIndex: selectedId === overlay.id ? 20 : 10,
                        touchAction: 'none'
                    }}
                >
                    {overlay.text}
                </div>
            ))}
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white dark:bg-zinc-900 p-4 border-t border-gray-200 dark:border-zinc-800 space-y-4 z-10 relative">

        {/* Toolbar */}
        <div className="flex justify-center gap-6 mb-2">
            <button
                onClick={addText}
                className="flex flex-col items-center gap-1 text-xs text-gray-600 dark:text-gray-400"
            >
                <div className="p-2 bg-gray-100 dark:bg-zinc-800 rounded-full">
                    <Plus className="w-5 h-5" />
                </div>
                追加
            </button>

            {selectedId && (
                <button
                    onClick={() => deleteOverlay(selectedId)}
                    className="flex flex-col items-center gap-1 text-xs text-red-600"
                >
                    <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-full">
                        <Trash2 className="w-5 h-5" />
                    </div>
                    削除
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
                    placeholder="テキストを入力..."
                />

                <div className="grid grid-cols-2 gap-4">
                    {/* Size Slider */}
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Maximize className="w-3 h-3" />
                            <span>サイズ</span>
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
                            <span>回転</span>
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

                {/* Colors with HexColorPicker */}
                <div className="flex items-center justify-between gap-4">
                    {/* Text Color */}
                    <div className="relative flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs text-gray-500">文字色</span>
                        </div>
                        <button
                            onClick={() => setActiveColorPicker(activeColorPicker === 'fill' ? null : 'fill')}
                            className="w-full h-10 rounded-lg border border-gray-200 dark:border-zinc-700 flex items-center justify-center"
                            style={{ backgroundColor: selectedOverlay.color }}
                        />
                        {activeColorPicker === 'fill' && (
                            <div className="absolute bottom-full mb-2 left-0 z-50">
                                <div className="p-3 bg-white dark:bg-zinc-800 rounded-xl shadow-xl border border-gray-200 dark:border-zinc-700">
                                    <HexColorPicker
                                        color={selectedOverlay.color}
                                        onChange={(color) => updateOverlay(selectedOverlay.id, { color })}
                                    />
                                </div>
                                <div
                                    className="fixed inset-0 z-40 bg-transparent"
                                    onClick={() => setActiveColorPicker(null)}
                                />
                            </div>
                        )}
                    </div>

                    {/* Outline Color */}
                    <div className="relative flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs text-gray-500">縁取り</span>
                        </div>
                        <button
                            onClick={() => setActiveColorPicker(activeColorPicker === 'outline' ? null : 'outline')}
                            className="w-full h-10 rounded-lg border border-gray-200 dark:border-zinc-700 flex items-center justify-center relative overflow-hidden"
                            style={{ backgroundColor: selectedOverlay.outlineColor === 'transparent' ? 'white' : selectedOverlay.outlineColor }}
                        >
                            {selectedOverlay.outlineColor === 'transparent' && (
                                <div className="absolute inset-0 flex items-center justify-center text-red-500">
                                    <X className="w-5 h-5" />
                                </div>
                            )}
                        </button>
                        {activeColorPicker === 'outline' && (
                            <div className="absolute bottom-full mb-2 right-0 z-50">
                                <div className="p-3 bg-white dark:bg-zinc-800 rounded-xl shadow-xl border border-gray-200 dark:border-zinc-700 flex flex-col gap-3">
                                    <HexColorPicker
                                        color={selectedOverlay.outlineColor === 'transparent' ? '#000000' : selectedOverlay.outlineColor}
                                        onChange={(color) => updateOverlay(selectedOverlay.id, { outlineColor: color })}
                                    />
                                    <button
                                        onClick={() => {
                                            updateOverlay(selectedOverlay.id, { outlineColor: 'transparent' });
                                            setActiveColorPicker(null);
                                        }}
                                        className="text-xs text-red-500 font-medium py-1 px-2 border border-red-200 rounded hover:bg-red-50"
                                    >
                                        縁取りなし
                                    </button>
                                </div>
                                <div
                                    className="fixed inset-0 z-40 bg-transparent"
                                    onClick={() => setActiveColorPicker(null)}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        ) : (
            <div className="text-center text-sm text-gray-500 py-4">
                テキストを選択または追加してください
            </div>
        )}
      </div>
    </div>
  );
}
