import type { Project } from "@/types";

/**
 * REST controller for talking to the local Express + SQL Server backend.
 * Base URL is read from VITE_API_URL (defaults to http://localhost:4000/api).
 * The backend persists everything in SQL Server — no in-memory storage.
 */
const BASE_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:4000/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${init?.method ?? "GET"} ${path} failed: ${res.status} ${text}`);
  }
  if (res.status === 204) return undefined as unknown as T;
  return (await res.json()) as T;
}

export type ProjectListItem = {
  id: string;
  name: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
};

export const projectsApi = {
  list: () => request<Project[]>("/projects"),
  get: (id: string) => request<Project>(`/projects/${id}`),
  create: (project: Project) =>
    request<Project>("/projects", {
      method: "POST",
      body: JSON.stringify(project),
    }),
  update: (project: Project) =>
    request<Project>(`/projects/${project.id}`, {
      method: "PUT",
      body: JSON.stringify(project),
    }),
  remove: (id: string) =>
    request<void>(`/projects/${id}`, { method: "DELETE" }),
};

export const settingsApi = {
  get: <T = unknown>() => request<T>("/settings"),
  put: <T = unknown>(value: T) =>
    request<T>("/settings", { method: "PUT", body: JSON.stringify(value) }),
};

export async function isApiReachable(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/health`);
    return res.ok;
  } catch {
    return false;
  }
}