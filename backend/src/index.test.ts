import { describe, it, expect } from "vitest";
import request from "supertest";
import express from "express";
import cors from "cors";
import { createServer } from "http";

// Inline a minimal version of the Express app for testing routes
// without starting the actual server
function createTestApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  const projects: any[] = [];

  app.get("/projects", (_req, res) => {
    res.json({ projects });
  });

  app.get("/projects/:id", (req, res) => {
    const project = projects.find((p) => p.project_id === req.params.id);
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    res.json({ project });
  });

  app.post("/projects", express.json(), (req, res) => {
    const { title, description } = req.body;
    if (!title?.trim()) {
      res.status(400).json({ error: "Title required" });
      return;
    }
    const project = {
      project_id: "test-" + Math.random(),
      project_title: title.trim(),
      project_description: description?.trim() ?? "",
      current_phase: "intake",
      status: "pending",
    };
    projects.push(project);
    res.status(201).json({ project });
  });

  return { app, projects };
}

describe("REST Endpoints", () => {
  it("GET /health returns 200 with status ok", async () => {
    const { app } = createTestApp();
    const server = createServer(app);
    const resp = await new Promise<any>((resolve) => {
      server.listen(0, () => {
        const addr = server.address() as any;
        const port = addr.port;
        request(`http://localhost:${port}`)
          .get("/health")
          .end((err, res) => {
            server.close();
            resolve(res);
          });
      });
    });
    expect(resp.status).toBe(200);
    expect(resp.body).toEqual({ status: "ok" });
  });

  it("GET /projects returns empty array initially", async () => {
    const { app } = createTestApp();
    const server = createServer(app);
    const resp = await new Promise<any>((resolve) => {
      server.listen(0, () => {
        const addr = server.address() as any;
        const port = addr.port;
        request(`http://localhost:${port}`)
          .get("/projects")
          .end((err, res) => {
            server.close();
            resolve(res);
          });
      });
    });
    expect(resp.status).toBe(200);
    expect(resp.body.projects).toEqual([]);
  });

  it("POST /projects creates project with 201", async () => {
    const { app, projects } = createTestApp();
    const server = createServer(app);
    const resp = await new Promise<any>((resolve) => {
      server.listen(0, () => {
        const addr = server.address() as any;
        const port = addr.port;
        request(`http://localhost:${port}`)
          .post("/projects")
          .send({ title: "Test Project", description: "A test" })
          .set("Content-Type", "application/json")
          .end((err, res) => {
            server.close();
            resolve(res);
          });
      });
    });
    expect(resp.status).toBe(201);
    expect(resp.body.project.project_title).toBe("Test Project");
    expect(resp.body.project.status).toBe("pending");
    expect(projects).toHaveLength(1);
  });

  it("POST /projects returns 400 when title missing", async () => {
    const { app } = createTestApp();
    const server = createServer(app);
    const resp = await new Promise<any>((resolve) => {
      server.listen(0, () => {
        const addr = server.address() as any;
        const port = addr.port;
        request(`http://localhost:${port}`)
          .post("/projects")
          .send({ description: "No title" })
          .set("Content-Type", "application/json")
          .end((err, res) => {
            server.close();
            resolve(res);
          });
      });
    });
    expect(resp.status).toBe(400);
    expect(resp.body.error).toBe("Title required");
  });

  it("GET /projects/:id returns 404 for unknown project", async () => {
    const { app } = createTestApp();
    const server = createServer(app);
    const resp = await new Promise<any>((resolve) => {
      server.listen(0, () => {
        const addr = server.address() as any;
        const port = addr.port;
        request(`http://localhost:${port}`)
          .get("/projects/nonexistent")
          .end((err, res) => {
            server.close();
            resolve(res);
          });
      });
    });
    expect(resp.status).toBe(404);
    expect(resp.body.error).toBe("Project not found");
  });
});