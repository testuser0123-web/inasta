"use client";

import React, { createContext, useContext, useState } from "react";

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
