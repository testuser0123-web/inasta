'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface InagawaCollapsibleProps {
  title: React.ReactNode;
  children: React.ReactNode;
  rightAction?: React.ReactNode;
}

export default function InagawaCollapsible({ title, children, rightAction }: InagawaCollapsibleProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            {title}
          </h2>
          {rightAction}
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="md:hidden flex items-center justify-center p-2 rounded-full hover:bg-muted transition-colors"
          aria-expanded={isOpen}
        >
          {isOpen ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
        </button>
      </div>
      <div className={`transition-all duration-300 ${isOpen ? 'block' : 'hidden'} md:block`}>
        {children}
      </div>
    </div>
  );
}
