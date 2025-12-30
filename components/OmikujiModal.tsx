'use client';

import { useState, useEffect } from 'react';
import { X, Sparkles } from 'lucide-react';

// Configuration
const OMIKUJI_DEBUG = process.env.NEXT_PUBLIC_OMIKUJI_DEBUG === 'true';

type Fortune = {
  name: string;
  color: string;
  textColor: string;
  description: string;
};

const FORTUNES: Fortune[] = [
  { name: 'イナ吉', color: '#00A86B', textColor: 'text-[#00A86B]', description: '超レア！イナズマ級の幸運が訪れるかも？' }, // Jade - 1%
  { name: 'ミイ吉', color: '#ADD8E6', textColor: 'text-[#ADD8E6]', description: '水のような清らかな心で過ごせそう。' }, // Light Blue - 2%
  { name: '大吉', color: '#FFD700', textColor: 'text-[#FFD700]', description: '最高の一年になりそう！' }, // Gold - 6%
  { name: '中吉', color: '#C0C0C0', textColor: 'text-[#C0C0C0]', description: '安定した運気。自信を持って進もう。' }, // Silver - 40%
  { name: '吉', color: '#CD7F32', textColor: 'text-[#CD7F32]', description: '日々の積み重ねが実を結ぶとき。' }, // Bronze - 25%
  { name: '小吉', color: '#E34234', textColor: 'text-[#E34234]', description: '小さな幸せを見つけられる予感。' }, // Vermilion - 20%
  { name: '末吉', color: '#808080', textColor: 'text-[#808080]', description: '焦らずゆっくり進めば道は開ける。' }, // Gray - 5%
  { name: '凶', color: '#800080', textColor: 'text-[#800080]', description: '気を引き締めていけば大丈夫。' }, // Purple - 1%
];

// Probabilities (Cumulative)
// Inakichi: 0 - 0.01
// Miikichi: 0.01 - 0.03
// Daikichi: 0.03 - 0.09
// Chukichi: 0.09 - 0.49
// Kichi: 0.49 - 0.74
// Shokichi: 0.74 - 0.94
// Suekichi: 0.94 - 0.99
// Kyo: 0.99 - 1.00

export default function OmikujiModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<'intro' | 'drawing' | 'result'>('intro');
  const [result, setResult] = useState<Fortune | null>(null);

  useEffect(() => {
    checkAvailability();
  }, []);

  const checkAvailability = () => {
    // 1. Check Date (JST)
    const now = new Date();
    // Create a date object for JST
    const jstDate = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
    const month = jstDate.getMonth() + 1; // 1-12
    const day = jstDate.getDate();

    const isNewYear = month === 1 && (day >= 1 && day <= 3);

    if (!isNewYear && !OMIKUJI_DEBUG) {
      return;
    }

    // 2. Check LocalStorage
    const storageKey = `omikuji_played_${jstDate.getFullYear()}-${month}-${day}`;
    const hasPlayed = localStorage.getItem(storageKey);

    if (hasPlayed && !OMIKUJI_DEBUG) {
      return;
    }

    // If we're here, we can play
    setIsOpen(true);
  };

  const drawOmikuji = () => {
    setStep('drawing');

    // Slight delay for anticipation
    setTimeout(() => {
      const rand = Math.random();
      let selected: Fortune;

      if (rand < 0.01) selected = FORTUNES[0]; // Inakichi 1%
      else if (rand < 0.03) selected = FORTUNES[1]; // Miikichi 2%
      else if (rand < 0.09) selected = FORTUNES[2]; // Daikichi 6%
      else if (rand < 0.49) selected = FORTUNES[3]; // Chukichi 40%
      else if (rand < 0.74) selected = FORTUNES[4]; // Kichi 25%
      else if (rand < 0.94) selected = FORTUNES[5]; // Shokichi 20%
      else if (rand < 0.99) selected = FORTUNES[6]; // Suekichi 5%
      else selected = FORTUNES[7]; // Kyo 1%

      setResult(selected);
      setStep('result');

      // Record participation
      if (!OMIKUJI_DEBUG) {
        const now = new Date();
        const jstDate = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
        const storageKey = `omikuji_played_${jstDate.getFullYear()}-${jstDate.getMonth() + 1}-${jstDate.getDate()}`;
        localStorage.setItem(storageKey, 'true');
      }
    }, 2000); // 2 seconds delay
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-300">
      <div className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-background p-6 shadow-xl border border-border">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
        >
          <X size={24} />
        </button>

        {step === 'intro' && (
          <div className="flex flex-col items-center text-center space-y-6 py-4">
            <h2 className="text-2xl font-bold text-foreground">🎍 新年運試し！ 🎍</h2>
            <div className="text-6xl animate-bounce">🧧</div>
            <p className="text-muted-foreground">
              新年あけましておめでとうございます！<br/>
              今年の運勢を占ってみませんか？
            </p>
            <button
              onClick={drawOmikuji}
              className="w-full bg-brand hover:bg-brand/90 text-white font-bold py-3 px-6 rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95"
            >
              おみくじに挑戦する！
            </button>
          </div>
        )}

        {step === 'drawing' && (
          <div className="flex flex-col items-center text-center space-y-8 py-8">
            <h3 className="text-xl font-medium text-foreground">運命を引いています...</h3>
            <div className="relative">
               {/* Shaking animation */}
               <div className="text-8xl animate-[wiggle_0.5s_ease-in-out_infinite]">🗳️</div>
            </div>
            <p className="text-sm text-muted-foreground animate-pulse">心を落ち着けてお待ちください</p>
          </div>
        )}

        {step === 'result' && result && (
          <div className="flex flex-col items-center text-center space-y-6 py-4 animate-in zoom-in duration-500">
             <div className="flex items-center space-x-2 text-brand">
                 <Sparkles className="h-5 w-5" />
                 <span className="font-bold">結果発表</span>
                 <Sparkles className="h-5 w-5" />
             </div>

             <div className={`text-5xl font-black ${result.textColor} drop-shadow-sm`}>
                 {result.name}
             </div>

             <div className="text-lg text-foreground font-medium">
                 {result.description}
             </div>

             <div className="pt-4 w-full">
                <button
                  onClick={handleClose}
                  className="w-full border border-input bg-transparent hover:bg-accent hover:text-accent-foreground text-foreground font-medium py-2 px-4 rounded-md transition-colors"
                >
                  閉じる
                </button>
             </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes wiggle {
          0%, 100% { transform: rotate(-10deg); }
          50% { transform: rotate(10deg); }
        }
      `}</style>
    </div>
  );
}
