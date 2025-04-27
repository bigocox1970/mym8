import React, { createContext, useContext, useState, ReactNode } from 'react';

type Severity = 'success' | 'error' | 'warning' | 'info';

interface SnackbarContextType {
  showSnackbar: (message: string, severity?: Severity) => void;
}

const SnackbarContext = createContext<SnackbarContextType>({
  showSnackbar: () => {}
});

export const SnackbarProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const showSnackbar = (message: string, severity: Severity = 'info') => {
    // For now, we'll just log to console
    // In a real app, you might want to use a UI library's snackbar component
    console.log(`[${severity.toUpperCase()}] ${message}`);
  };

  return (
    <SnackbarContext.Provider value={{ showSnackbar }}>
      {children}
    </SnackbarContext.Provider>
  );
};

export const useSnackbar = () => useContext(SnackbarContext); 