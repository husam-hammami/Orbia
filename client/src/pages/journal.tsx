import { useEffect } from "react";
import { useLocation } from "wouter";

export default function JournalPage() {
  const [, setLocation] = useLocation();
  
  useEffect(() => {
    setLocation("/?tab=journal");
  }, [setLocation]);

  return null;
}
