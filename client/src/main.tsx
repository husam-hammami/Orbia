import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const originalFetch = window.fetch.bind(window);
window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
  return originalFetch(input, {
    ...init,
    credentials: init?.credentials || "include",
  });
};

createRoot(document.getElementById("root")!).render(<App />);
