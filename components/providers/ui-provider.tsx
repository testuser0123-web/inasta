"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { usePathname } from 'next/navigation';

interface UIContextType {
  isUploading: boolean;
  setIsUploading: (value: boolean) => void;
  isSidebarVisible: boolean;
  setSidebarVisible: (value: boolean) => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [isUploading, setIsUploading] = useState(false);
  const [isSidebarVisible, setSidebarVisible] = useState(true);
  const pathname = usePathname();

  // Reset uploading state on route change (e.g. successful post redirect)
  useEffect(() => {
    setIsUploading(false);
    setSidebarVisible(true);
  }, [pathname]);

  return (
    <UIContext.Provider value={{
      isUploading,
      setIsUploading,
      isSidebarVisible,
      setSidebarVisible
    }}>
      {children}
    </UIContext.Provider>
  );
}

export function useUI() {
  const context = useContext(UIContext);
  if (context === undefined) {
    throw new Error("useUI must be used within a UIProvider");
  }
  return context;
}
