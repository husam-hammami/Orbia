import { useEffect } from "react";

export function useAndroidBack(isOpen: boolean, onClose: () => void) {
  useEffect(() => {
    if (!isOpen) return;
    
    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault();
      onClose();
      window.history.pushState(null, '', window.location.href);
    };
    
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isOpen, onClose]);
}
