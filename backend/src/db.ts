import { writeFileSync, readFileSync, existsSync, mkdirSync } from "fs";
import { dirname } from "path";
import type { ProjectItem } from "./state.js";

type Store = Record<string, ProjectItem>;

function dbPath(): string {
  return process.env.DB_PATH ?? "./data/projects.json";
}

function load(): Store {
  const p = dbPath();
  if (!existsSync(p)) return {};
  try {
    return JSON.parse(readFileSync(p, "utf-8")) as Store;
  } catch (err) {
    console.error(`[db] Failed to parse ${p}:`, err);
    return {};
  }
}

function persist(store: Store): void {
  const p = dbPath();
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(store, null, 2), "utf-8");
}

export function saveProject(project: ProjectItem): void {
  const store = load();
  store[project.project_id] = project;
  persist(store);
}

export function loadProject(id: string): ProjectItem | undefined {
  return load()[id];
}

export function getAllProjects(): ProjectItem[] {
  return Object.values(load());
}
