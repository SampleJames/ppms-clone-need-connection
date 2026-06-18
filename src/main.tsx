import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { bootstrapProjects } from "@/lib/storage";
import { msalReady } from "@/lib/msal";

// Pull projects from the local backend (SQL Server) before first render.
// We don't block render — the UI loads, then refreshes once the API replies.
void bootstrapProjects();

// Wait for MSAL initialization before mounting so MsalProvider is ready.
msalReady.finally(() => {
  createRoot(document.getElementById("root")!).render(<App />);
});
