import { Project, AppSettings, DEFAULT_APP_SETTINGS, DEFAULT_PROJECT_SETTINGS } from "@/types";
import { createSampleProject } from "./sampleData";
import { projectsApi, isApiReachable } from "./api";

const PROJECTS_KEY = "costmgr_projects";
const APP_SETTINGS_KEY = "costmgr_settings";
const SAMPLE_CREATED_KEY = "costmgr_sample_created_v3";

/**
 * Bootstrap projects from the backend at app start.
 * Fills the local cache used by the synchronous getters below.
 * If the API is unreachable we keep whatever is already cached so the UI
 * still renders, but writes will queue up and be re-tried on next save.
 */
let bootstrapped = false;
export async function bootstrapProjects(): Promise<void> {
  if (bootstrapped) return;
  bootstrapped = true;
  const reachable = await isApiReachable();
  if (!reachable) {
    console.warn("[storage] Backend API not reachable — using cached projects.");
    return;
  }
  try {
    const projects = await projectsApi.list();
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
    localStorage.setItem(SAMPLE_CREATED_KEY, "true");
    window.dispatchEvent(new Event("projectsChanged"));
  } catch (err) {
    console.error("[storage] Failed to bootstrap projects from API:", err);
  }
}

function fireAndForget(label: string, p: Promise<unknown>) {
  p.catch((err) => console.error(`[storage] ${label} failed:`, err));
}

export function getProjects(): Project[] {
  
  if (!localStorage.getItem(SAMPLE_CREATED_KEY)) {
    localStorage.setItem(SAMPLE_CREATED_KEY, "true");
    const sample = createSampleProject();
    const existing = localStorage.getItem(PROJECTS_KEY);
    const projects: Project[] = existing ? JSON.parse(existing) : [];
    projects.unshift(sample);
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
    fireAndForget("create sample", projectsApi.create(sample));
  }
  const data = localStorage.getItem(PROJECTS_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveProjects(projects: Project[]) {
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
}

export function getProject(id: string): Project | undefined {
  return getProjects().find((p) => p.id === id);
}

export function saveProject(project: Project) {
  const projects = getProjects();
  const idx = projects.findIndex((p) => p.id === project.id);
  project.updatedAt = new Date().toISOString();
  if (idx >= 0) {
    projects[idx] = project;
    saveProjects(projects);
    fireAndForget("update project", projectsApi.update(project));
  } else {
    projects.push(project);
    saveProjects(projects);
    fireAndForget("create project", projectsApi.create(project));
  }
}

export function deleteProject(id: string) {
  saveProjects(getProjects().filter((p) => p.id !== id));
  fireAndForget("delete project", projectsApi.remove(id));
}

export function createProject(name: string, description: string = ""): Project {
  const appSettings = getAppSettings();
  const project: Project = {
    id: crypto.randomUUID(),
    name,
    description,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    abcItems: [],
    dupaItems: [],
    settings: {
      ocmPercent: appSettings.defaultOcmPercent,
      profitPercent: appSettings.defaultProfitPercent,
      vatPercent: appSettings.defaultVatPercent,
      dupaIndirectCostPercent: appSettings.defaultOcmPercent + appSettings.defaultProfitPercent,
      dupaVatPercent: appSettings.defaultVatPercent,
    },
    versions: [],
  };
  saveProject(project);
  return project;
}

export function duplicateProject(id: string): Project | undefined {
  const original = getProject(id);
  if (!original) return undefined;
  const newProject: Project = {
    ...JSON.parse(JSON.stringify(original)),
    id: crypto.randomUUID(),
    name: `${original.name} (Copy)`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    versions: [],
  };
  saveProject(newProject);
  return newProject;
}

export function getAppSettings(): AppSettings {
  const data = localStorage.getItem(APP_SETTINGS_KEY);
  const parsed = data ? JSON.parse(data) : {};
  return {
    ...DEFAULT_APP_SETTINGS,
    ...parsed,
    units: parsed.units && parsed.units.length ? parsed.units : DEFAULT_APP_SETTINGS.units,
    favoriteUnits: parsed.favoriteUnits || DEFAULT_APP_SETTINGS.favoriteUnits || [],
  };
}

export function saveAppSettings(settings: AppSettings) {
  localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(settings));
}

export function getUnits(): string[] {
  return getAppSettings().units || [];
}

export function addUnit(unit: string): string[] {
  const trimmed = unit.trim();
  if (!trimmed) return getUnits();
  const settings = getAppSettings();
  const existing = settings.units || [];
  if (existing.some((u) => u.toLowerCase() === trimmed.toLowerCase())) return existing;
  const updated = [...existing, trimmed];
  saveAppSettings({ ...settings, units: updated });
  window.dispatchEvent(new Event('settingsChanged'));
  return updated;
}

export function removeUnit(unit: string): string[] {
  const settings = getAppSettings();
  const updated = (settings.units || []).filter((u) => u !== unit);
  const favs = (settings.favoriteUnits || []).filter((u) => u !== unit);
  saveAppSettings({ ...settings, units: updated, favoriteUnits: favs });
  window.dispatchEvent(new Event('settingsChanged'));
  return updated;
}

export function getFavoriteUnits(): string[] {
  return getAppSettings().favoriteUnits || [];
}

export function toggleFavoriteUnit(unit: string): string[] {
  const settings = getAppSettings();
  const favs = settings.favoriteUnits || [];
  const exists = favs.includes(unit);
  const updated = exists ? favs.filter((u) => u !== unit) : [...favs, unit];
  saveAppSettings({ ...settings, favoriteUnits: updated });
  window.dispatchEvent(new Event('settingsChanged'));
  return updated;
}
