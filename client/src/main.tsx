import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { Toaster } from "sonner";
import { useAuthStore } from "./store/authStore.ts";

const Root = () => {
  const { hydrate } = useAuthStore();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <StrictMode>
      <App />
      <Toaster richColors position="top-right" theme="dark" />
    </StrictMode>
  );
};

createRoot(document.getElementById("root")!).render(<Root />);
