import { Router } from "express";
import type { Request, Response } from "express";
import { createReadStream, existsSync } from "fs";
import path from "path";
import { getAllProjects, loadProject, saveProject, clearAllProjects } from "../db.js";
import { validateProjectInput } from "../validation.js";
import { makeEmptyProject } from "./ws-handlers.js";

// ─── Handler: GET /projects ───────────────────────────────────────────────────

function getProjects(_req: Request, res: Response): void {
  res.json({ projects: getAllProjects() });
}

// ─── Handler: GET /projects/:id ───────────────────────────────────────────────

function getProject(req: Request, res: Response): void {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const project = loadProject(id);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  res.json({ project });
}

// ─── Handler: POST /projects ──────────────────────────────────────────────────

function createProject(req: Request, res: Response): void {
  const { title, description } = req.body as { title?: string; description?: string };
  const t = title?.trim() ?? "";
  const d = description?.trim() ?? "";

  const validationError = validateProjectInput(t, d);
  if (validationError) {
    // Preserve original "Title required" phrasing for empty title (backward compat with tests)
    const msg = !t ? "Title required" : validationError;
    res.status(400).json({ error: msg });
    return;
  }

  const project = makeEmptyProject(t, d);
  saveProject(project);
  res.status(201).json({ project });
}

// ─── Handler: GET /download/:projectId ───────────────────────────────────────

function downloadZip(req: Request, res: Response): void {
  // Sanitize to prevent path traversal
  const rawId = Array.isArray(req.params.projectId) ? req.params.projectId[0] : req.params.projectId;
  const safeId = rawId.replace(/[^a-zA-Z0-9-]/g, "");
  const zipPath = path.resolve("./generated", `${safeId}.zip`);

  if (!existsSync(zipPath)) {
    res.status(404).json({ error: "Zip not found" });
    return;
  }

  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", `attachment; filename="${safeId}.zip"`);
  createReadStream(zipPath).pipe(res);
}

// ─── Router factory ───────────────────────────────────────────────────────────

function deleteAllProjects(_req: Request, res: Response): void {
  clearAllProjects();
  res.json({ ok: true });
}

export function makeRestRouter(): Router {
  const router = Router();
  router.get("/projects", getProjects);
  router.get("/projects/:id", getProject);
  router.post("/projects", createProject);
  router.delete("/projects", deleteAllProjects);
  router.get("/download/:projectId", downloadZip);
  return router;
}
