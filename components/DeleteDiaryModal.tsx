"use client";

import { Loader2, AlertTriangle } from "lucide-react";

interface DeleteDiaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}

export default function DeleteDiaryModal({
  isOpen,
  onClose,
  onConfirm,
  isDeleting,
}: DeleteDiaryModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-lg w-full max-w-md p-6 relative border dark:border-gray-800 shadow-xl">
        <button
          onClick={onClose}
          disabled={isDeleting}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 disabled:opacity-50"
        >
          ✕
        </button>

        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600">
            <AlertTriangle className="w-6 h-6" />
          </div>

          <h2 className="text-xl font-bold dark:text-white">日記の削除</h2>

          <p className="text-sm text-gray-600 dark:text-gray-300">
            本当にこの日記を削除しますか？<br />
            この操作は取り消すことができません。
          </p>
        </div>

        <div className="flex items-center gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 py-2 rounded-md font-medium text-sm transition-colors disabled:opacity-50"
          >
            キャンセル
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-md font-medium text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
            削除する
          </button>
        </div>
      </div>
    </div>
  );
}
