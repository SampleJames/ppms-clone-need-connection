import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { bootstrapProjects } from "@/lib/storage";

// Pull projects from the local backend (SQL Server) before first render.
// We don't block render — the UI loads, then refreshes once the API replies.
void bootstrapProjects();

createRoot(document.getElementById("root")!).render(<App />);
