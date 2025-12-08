"use client";

import { useState } from "react";
import {
  generateVerificationToken,
  verifyAccount,
} from "@/app/actions/verification";
import { Loader2, AlertCircle, CheckCircle, Copy } from "lucide-react";

export default function VerificationModal({
  isOpen,
  onClose,
  onVerified,
}: {
  isOpen: boolean;
  onClose: () => void;
  onVerified: () => void;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [bbsName, setBbsName] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">(
    "idle"
  );

  if (!isOpen) return null;

  const handleGenerateToken = async () => {
    if (!bbsName) return;
    setIsLoading(true);
    setMessage(null);
    setCopyStatus("idle");

    const result = await generateVerificationToken();
    if (result.success && result.token) {
      setToken(result.token);
      setStep(2);
    } else {
      setMessage({
        type: "error",
        text: result.message || "Failed to generate token",
      });
    }
    setIsLoading(false);
  };

  const handleVerify = async () => {
    setIsLoading(true);
    setMessage(null);

    const result = await verifyAccount(bbsName);
    if (result.success) {
      setMessage({ type: "success", text: result.message });
      setTimeout(() => {
        onVerified();
        onClose();
      }, 2000);
    } else {
      setMessage({ type: "error", text: result.message });
    }
    setIsLoading(false);
  };

  const handleCopy = async () => {
    if (!token) return;
    try {
      await navigator.clipboard.writeText(token);
      setCopyStatus("copied");
      setTimeout(() => setCopyStatus("idle"), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
      setCopyStatus("failed");
      setTimeout(() => setCopyStatus("idle"), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-white rounded-lg w-full max-w-md p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>

        <h2 className="text-xl font-bold mb-4">アカウント認証</h2>

        {step === 1 ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              アカウントを認証するには、したらばで使用している名前（トリップの元となる文字列）を入力してください。
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                BBS名
              </label>
              <div className="flex items-center gap-2">
                <span className="text-gray-500 font-mono">◆</span>
                <input
                  type="text"
                  value={bbsName}
                  onChange={(e) => setBbsName(e.target.value)}
                  className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2"
                  placeholder="ABC"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                トリップ名が「◆ABC」の場合、「ABC」と入力してください
              </p>
            </div>
            <button
              onClick={handleGenerateToken}
              disabled={!bbsName || isLoading}
              className="w-full bg-indigo-600 text-white py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50 flex justify-center"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                "次へ"
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-md border border-blue-100">
              <p className="text-sm text-blue-800 font-semibold mb-2">指示:</p>
              <ol className="list-decimal list-inside text-sm text-blue-700 space-y-1">
                <li>このタブを閉じないでください。</li>
                <li>認証スレに移動してください。</li>
                <li>
                  <strong>◆{bbsName}</strong>の名前で投稿してください。
                </li>
                <li>以下のトークンをメッセージ本文に含めてください。</li>
              </ol>
            </div>

            <div className="flex items-center gap-2 bg-gray-100 p-3 rounded-md border border-gray-300">
              <div className="flex-1 break-all font-mono text-sm select-all cursor-pointer">
                {token}
              </div>
              <button
                onClick={handleCopy}
                className="p-1 rounded-md hover:bg-gray-200 text-gray-600 transition-colors"
                aria-label="トークンをコピー"
              >
                <Copy className="w-5 h-5" />
              </button>
            </div>
            {copyStatus === "copied" && (
              <p className="text-xs text-green-600 text-center">
                コピーしました！
              </p>
            )}
            {copyStatus === "failed" && (
              <p className="text-xs text-red-600 text-center">
                コピーに失敗しました！
              </p>
            )}

            {message && (
              <div
                className={`p-3 rounded-md flex items-start gap-2 text-sm ${
                  message.type === "error"
                    ? "bg-red-50 text-red-700"
                    : "bg-green-50 text-green-700"
                }`}
              >
                {message.type === "error" ? (
                  <AlertCircle className="w-5 h-5 shrink-0" />
                ) : (
                  <CheckCircle className="w-5 h-5 shrink-0" />
                )}
                <span>{message.text}</span>
              </div>
            )}

            <button
              onClick={handleVerify}
              disabled={isLoading}
              className="w-full bg-indigo-600 text-white py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50 flex justify-center"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                "書き込んだ！"
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
