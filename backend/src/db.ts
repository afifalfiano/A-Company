import { writeFileSync, readFileSync, existsSync, mkdirSync } from "fs";
import { dirname } from "path";
import type { ProjectItem } from "./state.js";

function dbPath(): string {
  return process.env.DB_PATH ?? "./data/projects.json";
}

// In-memory store as source of truth — eliminates load/save races across await boundaries.
// File is read once on first access per path, then all reads/writes go through memStore.
let cachedPath: string | null = null;
const memStore = new Map<string, ProjectItem>();

function ensureLoaded(): void {
  const p = dbPath();
  if (cachedPath === p) return;
  memStore.clear();
  cachedPath = p;
  if (!existsSync(p)) return;
  try {
    const raw = JSON.parse(readFileSync(p, "utf-8")) as Record<string, ProjectItem>;
    for (const [k, v] of Object.entries(raw)) memStore.set(k, v);
  } catch (err) {
    console.error(`[db] Failed to parse ${p}:`, err);
  }
}

function persist(): void {
  const p = dbPath();
  mkdirSync(dirname(p), { recursive: true });
  const obj: Record<string, ProjectItem> = Object.fromEntries(memStore);
  writeFileSync(p, JSON.stringify(obj, null, 2), "utf-8");
}

export function saveProject(project: ProjectItem): void {
  ensureLoaded();
  memStore.set(project.project_id, project);
  persist();
}

export function loadProject(id: string): ProjectItem | undefined {
  ensureLoaded();
  return memStore.get(id);
}

export function getAllProjects(): ProjectItem[] {
  ensureLoaded();
  return [...memStore.values()];
}

export function clearAllProjects(): void {
  ensureLoaded();
  memStore.clear();
  persist();
}

// For testing only — forces a reload from disk on next access.
export function _clearCache(): void {
  cachedPath = null;
  memStore.clear();
}
