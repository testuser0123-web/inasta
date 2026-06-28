'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Coins } from 'lucide-react';
import { getInagawaStatus, giveAllowance } from '@/app/actions/inagawa';
import type { Session } from '@/lib/auth';

export default function InagawaModal({ session }: { session: Session | null }) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<'intro' | 'loading' | 'result'>('intro');
  const [result, setResult] = useState<{ timeString: string, amount: number, message: string, isRepdigit: boolean, gaveAllowance?: boolean } | null>(null);
  const [devOverride, setDevOverride] = useState('');

  // Prevent strict mode double execution on mount
  const hasCheckedRef = useRef(false);

  useEffect(() => {
    if (!session?.id) return;
    if (hasCheckedRef.current) return;

    const checkStatus = async () => {
      hasCheckedRef.current = true;
      try {
        const res = await getInagawaStatus();
        if (res && !res.error && !res.hasReceivedToday) {
          setIsOpen(true);
        }
      } catch (err) {
        console.error('Failed to check inagawa status:', err);
      }
    };

    checkStatus();
  }, [session]);

  const handleGiveAllowance = async (give: boolean) => {
    if (give) {
      setStep('loading');
    } else {
      // For "Don't give", bypass the loading screen and jump straight to the result.
      setResult({
        timeString: '',
        amount: 0,
        message: 'ᶘｲ;⇁;ﾅ川「イナー」',
        isRepdigit: false,
        gaveAllowance: false
      });
      setStep('result');
    }

    try {
      const res = await giveAllowance(give, devOverride);
      if (res.error) {
        if (give) setIsOpen(false);
        return;
      }

      if (give) {
        setResult({
          timeString: res.timeString!,
          amount: res.amount!,
          message: res.message!,
          isRepdigit: res.isRepdigit!,
          gaveAllowance: res.gaveAllowance!
        });
        setStep('result');
      }
    } catch (err) {
      console.error('Failed to give allowance:', err);
      if (give) setIsOpen(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-300"
      onClick={handleClose}
    >
      <div
        className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-background p-6 shadow-xl border border-border"
        onClick={(e) => e.stopPropagation()} // Prevent clicking inside modal from closing it
      >
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
          aria-label="Close"
        >
          <X size={24} />
        </button>

        {step === 'intro' && (
          <div className="flex flex-col items-center text-center space-y-6 py-4">
            <h2 className="kaomoji-safe text-2xl font-bold text-foreground">ᶘｲ^⇁^ﾅ川</h2>
            <div className="text-6xl animate-bounce">💸</div>
            <p className="kaomoji-safe text-lg font-medium text-foreground">
              「飼い主さん、おこづかいください！」
            </p>
            <div className="w-full space-y-3">
              <button
                onClick={() => handleGiveAllowance(true)}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
              >
                <Coins className="w-5 h-5" />
                おこづかいをあげる
              </button>
              <button
                onClick={() => handleGiveAllowance(false)}
                className="w-full bg-muted hover:bg-muted/80 text-muted-foreground font-bold py-3 px-6 rounded-full shadow-sm transition-transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
              >
                あげない
              </button>
            </div>
            {process.env.NODE_ENV === 'development' && (
              <div className="w-full pt-4 border-t mt-4">
                <p className="text-xs text-muted-foreground mb-2">[DEV] コンマの値を強制指定</p>
                <input
                  type="text"
                  value={devOverride}
                  onChange={(e) => setDevOverride(e.target.value.slice(0, 2))}
                  placeholder="例: 11, 17, 31"
                  className="w-full text-center px-3 py-1 text-sm border rounded bg-background"
                />
              </div>
            )}
          </div>
        )}

        {step === 'loading' && (
          <div className="flex flex-col items-center text-center space-y-8 py-8">
            <h3 className="text-xl font-medium text-foreground">おこづかい判定中...</h3>
            <div className="text-6xl animate-pulse">🕰️</div>
            <p className="text-sm text-muted-foreground">ぞろ目が出ないことを祈りましょう...</p>
          </div>
        )}

        {step === 'result' && result && (
          <div className="flex flex-col items-center text-center space-y-6 py-4 animate-in zoom-in duration-500">
             {result.gaveAllowance ? (
               <>
                 <div className="text-3xl font-mono font-bold tracking-wider bg-muted px-4 py-2 rounded-lg border">
                     {result.timeString}
                 </div>

                 <div className={`text-4xl font-black drop-shadow-sm ${result.amount > 0 ? 'text-green-500' : 'text-red-500'}`}>
                     {result.amount > 0 ? `${result.amount}円GET!` : `${Math.abs(result.amount)}円没収`}
                 </div>
               </>
             ) : (
                <div className="text-6xl mb-4">😿</div>
             )}

             <div className="kaomoji-safe text-lg text-foreground font-medium p-4 bg-muted/50 rounded-lg w-full">
                 {result.message}
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
    </div>
  );
}
