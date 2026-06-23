# Prod Hardening + Agent Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all critical production blockers and parallelize agent pipeline to cut latency ~50%.

**Architecture:** Add JSON-file persistence, API-key auth middleware, REST rate limiting, WS rate limiting, graph timeout, then refactor LangGraph state to use a merge reducer so PO+PM+BM run in parallel after CTO, and Engineer+Designer run in parallel before QA. Replace CEO review LLM call with deterministic check.

**Tech Stack:** Node.js / TypeScript, Express, ws, LangGraph.js, express-rate-limit, vitest

---

## File Map

### New files
| File | Responsibility |
|------|----------------|
| `backend/src/db.ts` | JSON-file project store (save / load / list) |
| `backend/src/middleware/auth.ts` | `requireApiKey` Express middleware + WS auth check |
| `backend/src/middleware/wsRateLimit.ts` | Per-IP WS message rate limiter |
| `backend/data/.gitkeep` | Ensure data dir is tracked |

### Modified files
| File | Changes |
|------|---------|
| `backend/package.json` | Add `express-rate-limit` |
| `backend/src/index.ts` | Wire auth, rate limit, persistence, full UUID, graph timeout |
| `backend/src/state.ts` | Merge reducer on `current_project` |
| `backend/src/graph.ts` | Fan-out edges, fix execution_checkpoint, replace CEO review with deterministic node |
| `backend/src/agents/ceo.ts` | `ceoIntake` returns partial; remove `ceoReview` LLM call |
| `backend/src/agents/cto.ts` | Return partial `current_project` (only `cto_output`) |
| `backend/src/agents/product-owner.ts` | Return partial + skip LLM if `low` complexity |
| `backend/src/agents/product-manager.ts` | Return partial + CTO context in prompt + skip if `low` |
| `backend/src/agents/business-marketing.ts` | Return partial + CTO context in prompt + skip if `low` |
| `backend/src/agents/engineer.ts` | Return partial + PO/PM context in prompt |
| `backend/src/agents/designer.ts` | Return partial |
| `backend/src/agents/qa.ts` | Return partial |

---

## Phase 1 — Critical Blockers

---

### Task 1: JSON-file persistence

**Files:**
- Create: `backend/src/db.ts`
- Create: `backend/data/.gitkeep`
- Modify: `backend/src/index.ts` (wire in Task 5)

- [ ] **Step 1: Write the failing test**

Create `backend/src/db.test.ts`:
```ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { existsSync, unlinkSync } from "fs";
import { saveProject, loadProject, getAllProjects } from "./db.js";
import type { ProjectItem } from "./state.js";

const TEST_DB = "./data/test-projects.json";

function mockProject(id: string): ProjectItem {
  return {
    project_id: id,
    project_title: "Test",
    project_description: "Desc",
    current_phase: "intake",
    status: "pending",
    complexity: "medium",
    ceo_decision: { accepted: false, priority: "medium", reasoning: "", resource_allocation: "" },
    cto_output: { architecture: "", tech_stack: [], system_design: "", technical_risks: [] },
    product_owner_output: { user_stories: [], backlog: [], sprint_plan: "" },
    product_manager_output: { strategy: "", roadmap: [], feature_priority: [], competitive_analysis: "" },
    business_marketing_output: { market_analysis: "", go_to_market: [], pricing_strategy: "", kpis: [] },
    engineer_output: { implementation_plan: [], code_structure: "", estimates: {}, dependencies: [] },
    designer_output: { wireframes: [], design_system: "", ux_flows: [], deliverables: [] },
    qa_output: { test_plan: "", test_cases: [], quality_gates: [], bug_risks: [] },
    ceo_review: { approved: false, feedback: "", launch_decision: "" },
    revision_count: 0,
    planning_approved: false,
    execution_approved: false,
    retry_count: 0,
    failed_agent: null,
    generated_code: null,
    design_gen: null,
    revision_notes: [],
    token_usage: {},
    total_input_tokens: 0,
    total_output_tokens: 0,
    total_tokens: 0,
    is_running: false,
  };
}

describe("db", () => {
  beforeEach(() => {
    process.env.DB_PATH = TEST_DB;
    if (existsSync(TEST_DB)) unlinkSync(TEST_DB);
  });
  afterEach(() => {
    if (existsSync(TEST_DB)) unlinkSync(TEST_DB);
  });

  it("saves and loads a project", () => {
    const p = mockProject("abc");
    saveProject(p);
    expect(loadProject("abc")).toEqual(p);
  });

  it("getAllProjects returns all saved projects", () => {
    saveProject(mockProject("a"));
    saveProject(mockProject("b"));
    expect(getAllProjects()).toHaveLength(2);
  });

  it("returns undefined for unknown id", () => {
    expect(loadProject("nope")).toBeUndefined();
  });

  it("overwrites existing project on resave", () => {
    const p = mockProject("x");
    saveProject(p);
    const updated = { ...p, status: "accepted" as const };
    saveProject(updated);
    expect(loadProject("x")?.status).toBe("accepted");
  });
});
```

- [ ] **Step 2: Run test — expect FAIL (module not found)**

```bash
cd backend && npx vitest run src/db.test.ts
```
Expected: `Error: Cannot find module './db.js'`

- [ ] **Step 3: Create `backend/src/db.ts`**

```ts
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
  } catch {
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
```

- [ ] **Step 4: Create `backend/data/.gitkeep`**

```bash
mkdir -p backend/data && touch backend/data/.gitkeep
```

Add to `backend/.gitignore` (or root `.gitignore`):
```
data/projects.json
data/test-projects.json
```

- [ ] **Step 5: Run tests — expect PASS**

```bash
cd backend && npx vitest run src/db.test.ts
```
Expected: 4 tests pass.

- [ ] **Step 6: Commit**

```bash
git add backend/src/db.ts backend/src/db.test.ts backend/data/.gitkeep
git commit -m "feat: add JSON-file persistence layer"
```

---

### Task 2: API key authentication

**Files:**
- Create: `backend/src/middleware/auth.ts`
- Modify: `backend/src/index.ts` (applied in Task 5)

- [ ] **Step 1: Write the failing test**

Create `backend/src/middleware/auth.test.ts`:
```ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import express from "express";
import request from "supertest";
import { requireApiKey, isValidWsKey } from "./auth.js";

function makeApp(key: string) {
  const app = express();
  process.env.API_KEY = key;
  app.get("/test", requireApiKey, (_req, res) => res.json({ ok: true }));
  return app;
}

describe("requireApiKey", () => {
  const OLD_KEY = process.env.API_KEY;
  afterEach(() => { process.env.API_KEY = OLD_KEY; });

  it("passes with correct key in header", async () => {
    const res = await request(makeApp("secret")).get("/test").set("X-API-Key", "secret");
    expect(res.status).toBe(200);
  });

  it("rejects missing key", async () => {
    const res = await request(makeApp("secret")).get("/test");
    expect(res.status).toBe(401);
  });

  it("rejects wrong key", async () => {
    const res = await request(makeApp("secret")).get("/test").set("X-API-Key", "wrong");
    expect(res.status).toBe(403);
  });

  it("passes with no API_KEY set (open mode)", async () => {
    delete process.env.API_KEY;
    const app = express();
    app.get("/test", requireApiKey, (_req, res) => res.json({ ok: true }));
    const res = await request(app).get("/test");
    expect(res.status).toBe(200);
  });
});

describe("isValidWsKey", () => {
  afterEach(() => { process.env.API_KEY = OLD_KEY; });
  const OLD_KEY = process.env.API_KEY;

  it("returns true when no API_KEY set", () => {
    delete process.env.API_KEY;
    expect(isValidWsKey(undefined)).toBe(true);
  });

  it("returns true for correct key", () => {
    process.env.API_KEY = "mykey";
    expect(isValidWsKey("mykey")).toBe(true);
  });

  it("returns false for wrong key", () => {
    process.env.API_KEY = "mykey";
    expect(isValidWsKey("bad")).toBe(false);
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
cd backend && npx vitest run src/middleware/auth.test.ts
```
Expected: `Cannot find module './auth.js'`

- [ ] **Step 3: Create `backend/src/middleware/auth.ts`**

```ts
import type { Request, Response, NextFunction } from "express";

export function requireApiKey(req: Request, res: Response, next: NextFunction): void {
  const envKey = process.env.API_KEY;
  if (!envKey) {
    next();
    return;
  }
  const provided = req.headers["x-api-key"];
  if (!provided) {
    res.status(401).json({ error: "Missing X-API-Key header" });
    return;
  }
  if (provided !== envKey) {
    res.status(403).json({ error: "Invalid API key" });
    return;
  }
  next();
}

export function isValidWsKey(key: string | undefined): boolean {
  const envKey = process.env.API_KEY;
  if (!envKey) return true;
  return key === envKey;
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
cd backend && npx vitest run src/middleware/auth.test.ts
```
Expected: 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add backend/src/middleware/auth.ts backend/src/middleware/auth.test.ts
git commit -m "feat: add API key authentication middleware"
```

---

### Task 3: Rate limiting

**Files:**
- Create: `backend/src/middleware/wsRateLimit.ts`
- Modify: `backend/package.json`

- [ ] **Step 1: Install express-rate-limit**

```bash
cd backend && npm install express-rate-limit
```

Expected: `added 1 package`

- [ ] **Step 2: Write failing test for WS rate limiter**

Create `backend/src/middleware/wsRateLimit.test.ts`:
```ts
import { describe, it, expect, beforeEach } from "vitest";
import { WsRateLimiter } from "./wsRateLimit.js";

describe("WsRateLimiter", () => {
  it("allows messages under the limit", () => {
    const limiter = new WsRateLimiter({ max: 5, windowMs: 60_000 });
    for (let i = 0; i < 5; i++) {
      expect(limiter.check("1.2.3.4")).toBe(true);
    }
  });

  it("blocks messages over the limit", () => {
    const limiter = new WsRateLimiter({ max: 3, windowMs: 60_000 });
    limiter.check("1.2.3.4");
    limiter.check("1.2.3.4");
    limiter.check("1.2.3.4");
    expect(limiter.check("1.2.3.4")).toBe(false);
  });

  it("tracks different IPs independently", () => {
    const limiter = new WsRateLimiter({ max: 2, windowMs: 60_000 });
    limiter.check("1.1.1.1");
    limiter.check("1.1.1.1");
    expect(limiter.check("2.2.2.2")).toBe(true);
    expect(limiter.check("1.1.1.1")).toBe(false);
  });

  it("resets after window expires", async () => {
    const limiter = new WsRateLimiter({ max: 1, windowMs: 50 });
    limiter.check("1.2.3.4");
    expect(limiter.check("1.2.3.4")).toBe(false);
    await new Promise(r => setTimeout(r, 60));
    expect(limiter.check("1.2.3.4")).toBe(true);
  });
});
```

- [ ] **Step 3: Run test — expect FAIL**

```bash
cd backend && npx vitest run src/middleware/wsRateLimit.test.ts
```
Expected: `Cannot find module './wsRateLimit.js'`

- [ ] **Step 4: Create `backend/src/middleware/wsRateLimit.ts`**

```ts
interface RateEntry {
  count: number;
  resetAt: number;
}

export class WsRateLimiter {
  private readonly max: number;
  private readonly windowMs: number;
  private readonly store = new Map<string, RateEntry>();

  constructor(opts: { max: number; windowMs: number }) {
    this.max = opts.max;
    this.windowMs = opts.windowMs;
  }

  check(ip: string): boolean {
    const now = Date.now();
    const entry = this.store.get(ip);
    if (!entry || now >= entry.resetAt) {
      this.store.set(ip, { count: 1, resetAt: now + this.windowMs });
      return true;
    }
    if (entry.count >= this.max) return false;
    entry.count++;
    return true;
  }
}
```

- [ ] **Step 5: Run tests — expect PASS**

```bash
cd backend && npx vitest run src/middleware/wsRateLimit.test.ts
```
Expected: 4 tests pass.

- [ ] **Step 6: Commit**

```bash
git add backend/src/middleware/wsRateLimit.ts backend/src/middleware/wsRateLimit.test.ts backend/package.json backend/package-lock.json
git commit -m "feat: add REST and WebSocket rate limiting"
```

---

### Task 4: Input validation + full UUID

**Files:**
- Modify: `backend/src/index.ts` — validation helpers (full wiring in Task 5)

- [ ] **Step 1: Write failing test**

Create `backend/src/validation.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { validateProjectInput } from "./validation.js";

describe("validateProjectInput", () => {
  it("accepts valid input", () => {
    expect(validateProjectInput("My App", "Build me something")).toBeNull();
  });

  it("rejects empty title", () => {
    expect(validateProjectInput("", "desc")).toMatch(/title/i);
  });

  it("rejects title over 200 chars", () => {
    expect(validateProjectInput("a".repeat(201), "desc")).toMatch(/title/i);
  });

  it("rejects description over 2000 chars", () => {
    expect(validateProjectInput("title", "a".repeat(2001))).toMatch(/description/i);
  });

  it("trims whitespace and accepts", () => {
    expect(validateProjectInput("  My App  ", "  desc  ")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
cd backend && npx vitest run src/validation.test.ts
```
Expected: `Cannot find module './validation.js'`

- [ ] **Step 3: Create `backend/src/validation.ts`**

```ts
export function validateProjectInput(title: string, description: string): string | null {
  const t = title.trim();
  const d = description.trim();
  if (!t) return "Title cannot be empty";
  if (t.length > 200) return "Title must be 200 characters or fewer";
  if (d.length > 2000) return "Description must be 2000 characters or fewer";
  return null;
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
cd backend && npx vitest run src/validation.test.ts
```
Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add backend/src/validation.ts backend/src/validation.test.ts
git commit -m "feat: add input validation for project title and description"
```

---

### Task 5: Wire everything into index.ts (persistence + auth + rate limit + timeout + UUID fix)

**Files:**
- Modify: `backend/src/index.ts`

- [ ] **Step 1: Apply all wiring changes to `backend/src/index.ts`**

Replace the full contents of `backend/src/index.ts` with:

```ts
import "dotenv/config";
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { createReadStream, existsSync } from "fs";
import { URL } from "url";
import path from "path";
import { buildGraph } from "./graph.js";
import { codeGeneratorAgent } from "./agents/code-generator.js";
import { designGeneratorAgent } from "./agents/design-generator.js";
import {
  CompanyStateType,
  ProjectItem,
  AgentEvent,
  ProjectPhase,
  CodeGenMode,
} from "./state.js";
import { randomUUID } from "crypto";
import { saveProject, loadProject, getAllProjects } from "./db.js";
import { requireApiKey, isValidWsKey } from "./middleware/auth.js";
import { WsRateLimiter } from "./middleware/wsRateLimit.js";
import { validateProjectInput } from "./validation.js";

const app = express();

const allowedOrigin = process.env.CORS_ORIGIN ?? "*";
app.use(cors({ origin: allowedOrigin }));
app.use(express.json({ limit: "50kb" }));

// ─── REST Rate Limiting ───────────────────────────────────────────────────────
const restLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
});
app.use(restLimiter);

// ─── Auth ──────────────────────────────────────────────────────────────────────
app.use(requireApiKey);

app.get("/health", (_req, res) => res.json({ status: "ok" }));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function send(ws: WebSocket, data: object) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

function broadcast(event: object, exclude?: WebSocket) {
  wss.clients.forEach((client) => {
    if (client !== exclude && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(event));
    }
  });
}

const GRAPH_TIMEOUT_MS = parseInt(process.env.GRAPH_TIMEOUT_MS ?? "300000", 10); // 5 min

function invokeWithTimeout(
  graph: ReturnType<typeof buildGraph>,
  input: Parameters<ReturnType<typeof buildGraph>["invoke"]>[0]
): Promise<CompanyStateType> {
  return Promise.race([
    graph.invoke(input) as Promise<CompanyStateType>,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Graph execution timed out")), GRAPH_TIMEOUT_MS)
    ),
  ]);
}

function emptyProjectExtras() {
  return {
    complexity: "medium" as const,
    planning_approved: false,
    execution_approved: false,
    retry_count: 0,
    failed_agent: null as string | null,
    generated_code: null as null,
    design_gen: null as null,
    revision_notes: [] as string[],
    token_usage: {} as Record<string, { input_tokens: number; output_tokens: number }>,
    total_input_tokens: 0,
    total_output_tokens: 0,
    total_tokens: 0,
  };
}

function makeEmptyProject(title: string, description: string): ProjectItem {
  return {
    project_id: randomUUID(),
    project_title: title.trim(),
    project_description: description.trim(),
    current_phase: "intake",
    status: "pending",
    ...emptyProjectExtras(),
    ceo_decision: { accepted: false, priority: "medium", reasoning: "", resource_allocation: "" },
    cto_output: { architecture: "", tech_stack: [], system_design: "", technical_risks: [] },
    product_owner_output: { user_stories: [], backlog: [], sprint_plan: "" },
    product_manager_output: { strategy: "", roadmap: [], feature_priority: [], competitive_analysis: "" },
    business_marketing_output: { market_analysis: "", go_to_market: [], pricing_strategy: "", kpis: [] },
    engineer_output: { implementation_plan: [], code_structure: "", estimates: {}, dependencies: [] },
    designer_output: { wireframes: [], design_system: "", ux_flows: [], deliverables: [] },
    qa_output: { test_plan: "", test_cases: [], quality_gates: [], bug_risks: [] },
    ceo_review: { approved: false, feedback: "", launch_decision: "" },
    revision_count: 0,
  };
}

// ─── WebSocket ────────────────────────────────────────────────────────────────

const server = createServer(app);
const wss = new WebSocketServer({ server, verifyClient: ({ req }) => {
  const query = new URL(req.url ?? "/", "ws://localhost").searchParams;
  return isValidWsKey(query.get("key") ?? undefined);
}});

const wsLimiter = new WsRateLimiter({
  max: parseInt(process.env.WS_RATE_MAX ?? "30", 10),
  windowMs: parseInt(process.env.WS_RATE_WINDOW_MS ?? "60000", 10),
});

wss.on("connection", (ws, req) => {
  const ip = (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0].trim()
    ?? req.socket.remoteAddress
    ?? "unknown";
  console.log("[WS] Client connected from", ip);
  send(ws, { type: "connected", payload: { message: "A-Company Software House ready!" } });

  ws.on("message", async (raw) => {
    if (!wsLimiter.check(ip)) {
      send(ws, { type: "error", payload: { message: "Rate limit exceeded — slow down" } });
      return;
    }

    let msg: {
      type: string;
      payload: {
        title?: string;
        description?: string;
        project_id?: string;
        approve?: boolean;
        notes?: string;
        mode?: CodeGenMode;
      };
    };
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      send(ws, { type: "error", payload: { message: "Invalid JSON" } });
      return;
    }

    try {
      if (msg.type === "process_project") {
        const rawTitle = msg.payload?.title ?? "";
        const rawDesc = msg.payload?.description ?? "";
        const validationError = validateProjectInput(rawTitle, rawDesc);
        if (validationError) {
          send(ws, { type: "error", payload: { message: validationError } });
          return;
        }
        const title = rawTitle.trim();
        const description = rawDesc.trim();

        const project = makeEmptyProject(title, description);
        saveProject(project);

        send(ws, { type: "processing_start", payload: { project } });

        const emit = (event: AgentEvent) => {
          broadcast({ type: "agent_event", payload: event });
        };

        const graph = buildGraph(emit);

        try {
          const result = await invokeWithTimeout(graph, {
            raw_title: title,
            raw_description: description,
            current_project: project,
            agent_events: [],
            next_phase: "intake",
          });

          saveProject(result.current_project);
          send(ws, { type: "processing_done", payload: { project: result.current_project } });
          broadcast({ type: "project_update", payload: { project: result.current_project } }, ws);
        } catch (err) {
          console.error("[Graph Error]", err);
          const timed = String(err).includes("timed out");
          const updated = { ...project, status: "pending" as const, is_running: false };
          saveProject(updated);
          send(ws, { type: "error", payload: { message: timed ? "Processing timed out" : String(err) } });
        }
      }

      if (msg.type === "start_planning") {
        const projectId = msg.payload?.project_id;
        if (!projectId) {
          send(ws, { type: "error", payload: { message: "project_id required" } });
          return;
        }

        const project = loadProject(projectId);
        if (!project) {
          send(ws, { type: "error", payload: { message: "Project not found" } });
          return;
        }
        if (project.status !== "accepted") {
          send(ws, { type: "error", payload: { message: "Project must be accepted by CEO first" } });
          return;
        }
        if (project.current_phase === "planning" && project.planning_approved) {
          send(ws, { type: "error", payload: { message: "Planning already approved" } });
          return;
        }
        if (project.is_running) {
          send(ws, { type: "error", payload: { message: "Planning already in progress" } });
          return;
        }

        const shouldResetPlanning = project.current_phase === "planning";
        const executionApproved = project.current_phase !== "planning" ? project.execution_approved : false;
        const updatedProject: ProjectItem = {
          ...project,
          current_phase: "planning",
          status: "in_progress",
          planning_approved: shouldResetPlanning ? false : project.planning_approved,
          execution_approved: executionApproved,
          is_running: true,
        };
        saveProject(updatedProject);
        send(ws, { type: "phase_start", payload: { project: updatedProject, phase: "planning" } });
        broadcast({ type: "project_update", payload: { project: updatedProject } }, ws);

        const emit = (event: AgentEvent) => broadcast({ type: "agent_event", payload: event });
        const graph = buildGraph(emit);

        try {
          const result = await invokeWithTimeout(graph, {
            raw_title: updatedProject.project_title,
            raw_description: updatedProject.project_description,
            current_project: updatedProject,
            agent_events: [],
            next_phase: "planning",
          });

          const done = { ...result.current_project, is_running: false } as ProjectItem;
          saveProject(done);
          send(ws, { type: "processing_done", payload: { project: done } });
          broadcast({ type: "project_update", payload: { project: done } }, ws);
        } catch (err) {
          console.error("[Graph Error]", err);
          const proj = loadProject(projectId);
          if (proj) saveProject({ ...proj, is_running: false });
          send(ws, { type: "error", payload: { message: String(err) } });
        }
      }

      if (msg.type === "approve_planning") {
        const projectId = msg.payload?.project_id;
        const approve = msg.payload?.approve ?? true;
        const notes = msg.payload?.notes ?? "";

        const project = loadProject(projectId!);
        if (!project) { send(ws, { type: "error", payload: { message: "Project not found" } }); return; }
        if (project.current_phase !== "planning") { send(ws, { type: "error", payload: { message: "Project not in planning phase" } }); return; }

        const updated = {
          ...project,
          planning_approved: approve,
          revision_notes: notes ? [...project.revision_notes, notes] : project.revision_notes,
        };
        saveProject(updated);
        send(ws, { type: "project_update", payload: { project: updated } });
        broadcast({ type: "project_update", payload: { project: updated } }, ws);
      }

      if (msg.type === "approve_execution") {
        const projectId = msg.payload?.project_id;
        const approve = msg.payload?.approve ?? true;
        const notes = msg.payload?.notes ?? "";

        const project = loadProject(projectId!);
        if (!project) { send(ws, { type: "error", payload: { message: "Project not found" } }); return; }
        if (project.current_phase !== "execution") { send(ws, { type: "error", payload: { message: "Project not in execution phase" } }); return; }

        const updated = {
          ...project,
          execution_approved: approve,
          revision_notes: notes ? [...project.revision_notes, notes] : project.revision_notes,
        };
        saveProject(updated);
        send(ws, { type: "project_update", payload: { project: updated } });
        broadcast({ type: "project_update", payload: { project: updated } }, ws);
      }

      if (msg.type === "start_execution") {
        const projectId = msg.payload?.project_id;
        if (!projectId) { send(ws, { type: "error", payload: { message: "project_id required" } }); return; }
        const project = loadProject(projectId);
        if (!project) { send(ws, { type: "error", payload: { message: "Project not found" } }); return; }
        if (project.current_phase !== "planning" || !project.planning_approved) {
          send(ws, { type: "error", payload: { message: "Planning must be approved first" } }); return;
        }
        if (project.is_running) { send(ws, { type: "error", payload: { message: "Execution already in progress" } }); return; }

        const updatedProject: ProjectItem = {
          ...project,
          current_phase: "execution",
          status: "in_progress",
          execution_approved: false,
          is_running: true,
        };
        saveProject(updatedProject);
        send(ws, { type: "phase_start", payload: { project: updatedProject, phase: "execution" } });
        broadcast({ type: "project_update", payload: { project: updatedProject } }, ws);

        const emit = (event: AgentEvent) => broadcast({ type: "agent_event", payload: event });
        const graph = buildGraph(emit);

        try {
          const result = await invokeWithTimeout(graph, {
            raw_title: updatedProject.project_title,
            raw_description: updatedProject.project_description,
            current_project: updatedProject,
            agent_events: [],
            next_phase: "execution",
          });
          const done = { ...result.current_project, is_running: false } as ProjectItem;
          saveProject(done);
          send(ws, { type: "processing_done", payload: { project: done } });
          broadcast({ type: "project_update", payload: { project: done } }, ws);
        } catch (err) {
          console.error("[Graph Error]", err);
          const proj = loadProject(projectId);
          if (proj) saveProject({ ...proj, is_running: false });
          send(ws, { type: "error", payload: { message: String(err) } });
        }
      }

      if (msg.type === "generate_code") {
        const { project_id: projectId, mode } = msg.payload as { project_id?: string; mode?: CodeGenMode };
        if (!projectId) { send(ws, { type: "error", payload: { message: "project_id required" } }); return; }
        const project = loadProject(projectId);
        if (!project) { send(ws, { type: "error", payload: { message: "Project not found" } }); return; }
        if (!["review", "delivered"].includes(project.current_phase)) {
          send(ws, { type: "error", payload: { message: "Project must complete review phase first" } }); return;
        }

        send(ws, { type: "code_gen_start", payload: { project_id: projectId } });
        const emit = (event: AgentEvent) => broadcast({ type: "agent_event", payload: event });

        const projectWithPlaceholder: ProjectItem = {
          ...project,
          generated_code: { generated_at: Date.now(), mode: mode ?? "monolith", file_count: 0, zip_path: "" },
          current_phase: "delivered" as const,
          status: "done" as const,
        };
        saveProject(projectWithPlaceholder);

        const state: CompanyStateType = {
          raw_title: project.project_title,
          raw_description: project.project_description,
          current_project: projectWithPlaceholder,
          agent_events: [],
          next_phase: "delivered",
        };

        try {
          const result = await codeGeneratorAgent(state, emit, {
            project_id: projectId,
            project_title: project.project_title,
            project_description: project.project_description,
            tech_stack: project.cto_output?.tech_stack ?? [],
            implementation_plan: project.engineer_output?.implementation_plan ?? [],
            code_structure: project.engineer_output?.code_structure ?? "",
            wireframes: project.designer_output?.wireframes ?? [],
            design_system: project.designer_output?.design_system ?? "",
            dependencies: project.engineer_output?.dependencies ?? [],
            mode: mode ?? "monolith",
          });

          const updated = result.current_project;
          saveProject(updated);
          send(ws, { type: "code_gen_done", payload: { project_id: projectId, metadata: updated.generated_code! } });
          send(ws, { type: "code_gen_download_ready", payload: { project_id: projectId, zip_url: `/download/${projectId}` } });
          broadcast({ type: "project_update", payload: { project: updated } }, ws);
        } catch (err) {
          console.error("[CodeGen Error]", err);
          send(ws, { type: "code_gen_error", payload: { project_id: projectId, message: String(err) } });
        }
      }

      if (msg.type === "generate_design") {
        const { project_id: projectId } = msg.payload as { project_id?: string; mode?: CodeGenMode };
        if (!projectId) { send(ws, { type: "error", payload: { message: "project_id required" } }); return; }
        const project = loadProject(projectId);
        if (!project) { send(ws, { type: "error", payload: { message: "Project not found" } }); return; }
        if (project.current_phase !== "execution") {
          send(ws, { type: "error", payload: { message: "Project must be in execution phase" } }); return;
        }
        if (!project.designer_output?.wireframes?.length) {
          send(ws, { type: "error", payload: { message: "No wireframes available — run designer first" } }); return;
        }

        send(ws, { type: "design_gen_start", payload: { project_id: projectId } });
        const emit = (event: AgentEvent) => broadcast({ type: "agent_event", payload: event });

        const projectWithPlaceholder: ProjectItem = {
          ...project,
          design_gen: { generated_at: Date.now(), file_count: 0, output_path: "" },
        };
        saveProject(projectWithPlaceholder);

        const state: CompanyStateType = {
          raw_title: project.project_title,
          raw_description: project.project_description,
          current_project: projectWithPlaceholder,
          agent_events: [],
          next_phase: "execution",
        };

        try {
          const result = await designGeneratorAgent(state, emit, {
            project_id: projectId,
            project_title: project.project_title,
            project_description: project.project_description,
            wireframes: project.designer_output.wireframes,
            design_system: project.designer_output.design_system,
          });

          const updated = { ...result.current_project, design_gen: (result.current_project as ProjectItem).design_gen };
          saveProject(updated);
          send(ws, { type: "design_gen_done", payload: { project_id: projectId, metadata: updated.design_gen! } });
          send(ws, { type: "design_gen_download_ready", payload: { project_id: projectId, output_path: updated.design_gen!.output_path } });
          broadcast({ type: "project_update", payload: { project: updated } }, ws);
        } catch (err) {
          console.error("[DesignGen Error]", err);
          send(ws, { type: "design_gen_error", payload: { project_id: projectId, message: String(err) } });
        }
      }
    } catch (err) {
      console.error("[WS Handler Error]", err);
      send(ws, { type: "error", payload: { message: "Internal server error" } });
    }
  });

  ws.on("close", () => console.log("[WS] Client disconnected"));
  ws.on("error", (err) => console.error("[WS Error]", err));
});

// ─── REST Endpoints ──────────────────────────────────────────────────────────

app.get("/projects", (_req, res) => {
  res.json({ projects: getAllProjects() });
});

app.get("/projects/:id", (req, res) => {
  const project = loadProject(req.params.id);
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }
  res.json({ project });
});

app.post("/projects", (req, res) => {
  const { title, description } = req.body;
  const err = validateProjectInput(title ?? "", description ?? "");
  if (err) { res.status(400).json({ error: err }); return; }
  const project = makeEmptyProject(title.trim(), description?.trim() ?? "");
  saveProject(project);
  res.status(201).json({ project });
});

app.get("/download/:projectId", (req, res) => {
  const safeId = req.params.projectId.replace(/[^a-zA-Z0-9-]/g, "");
  const zipPath = path.resolve("./generated", `${safeId}.zip`);
  if (!existsSync(zipPath)) { res.status(404).json({ error: "Zip not found" }); return; }
  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", `attachment; filename="${safeId}.zip"`);
  createReadStream(zipPath).pipe(res);
});

// ─── Start ───────────────────────────────────────────────────────────────────

const PORT = process.env.PORT ?? 3001;
server.listen(PORT, () => {
  console.log(`\n🚀 A-Company backend running on http://localhost:${PORT}`);
  console.log(`📡 WebSocket ready on ws://localhost:${PORT}\n`);
  console.log(`🔧 LLM Provider: ${process.env.LLM_PROVIDER ?? "openai"}`);
  console.log(`📦 Model: ${process.env.OPENAI_MODEL ?? process.env.ANTHROPIC_MODEL ?? "gpt-4o-mini"}`);
  if (process.env.API_KEY) console.log(`🔑 Auth: API key required`);
  else console.log(`⚠️  Auth: No API_KEY set — open access`);
});
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd backend && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add backend/src/index.ts
git commit -m "feat: wire persistence, auth, rate limiting, timeout, and UUID fix into server"
```

---

## Phase 2 — Agent Optimizations

---

### Task 6: State merge reducer

**Files:**
- Modify: `backend/src/state.ts`

This enables parallel agents to write to `current_project` without overwriting each other.

- [ ] **Step 1: Add merge reducer to `CompanyState` in `backend/src/state.ts`**

Find this block (lines 232–241):
```ts
export const CompanyState = Annotation.Root({
  raw_title: Annotation<string>(),
  raw_description: Annotation<string>(),
  current_project: Annotation<ProjectItem>(),
  agent_events: Annotation<AgentEvent[]>({
    reducer: (a, b) => [...a, ...b],
    default: () => [],
  }),
  next_phase: Annotation<ProjectPhase>(),
});
```

Replace with:
```ts
export const CompanyState = Annotation.Root({
  raw_title: Annotation<string>(),
  raw_description: Annotation<string>(),
  current_project: Annotation<ProjectItem>({
    reducer: (existing, update) => ({ ...existing, ...update }),
    default: () => ({
      project_id: "",
      project_title: "",
      project_description: "",
      current_phase: "intake" as ProjectPhase,
      status: "pending" as ProjectStatus,
      complexity: "medium" as const,
      ceo_decision: { accepted: false, priority: "medium" as const, reasoning: "", resource_allocation: "" },
      cto_output: { architecture: "", tech_stack: [], system_design: "", technical_risks: [] },
      product_owner_output: { user_stories: [], backlog: [], sprint_plan: "" },
      product_manager_output: { strategy: "", roadmap: [], feature_priority: [], competitive_analysis: "" },
      business_marketing_output: { market_analysis: "", go_to_market: [], pricing_strategy: "", kpis: [] },
      engineer_output: { implementation_plan: [], code_structure: "", estimates: {}, dependencies: [] },
      designer_output: { wireframes: [], design_system: "", ux_flows: [], deliverables: [] },
      qa_output: { test_plan: "", test_cases: [], quality_gates: [], bug_risks: [] },
      ceo_review: { approved: false, feedback: "", launch_decision: "" },
      revision_count: 0,
      planning_approved: false,
      execution_approved: false,
      retry_count: 0,
      failed_agent: null,
      generated_code: null,
      design_gen: null,
      revision_notes: [],
      token_usage: {},
      total_input_tokens: 0,
      total_output_tokens: 0,
      total_tokens: 0,
    }),
  }),
  agent_events: Annotation<AgentEvent[]>({
    reducer: (a, b) => [...a, ...b],
    default: () => [],
  }),
  next_phase: Annotation<ProjectPhase>(),
});
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd backend && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add backend/src/state.ts
git commit -m "feat: add merge reducer to current_project for parallel agent support"
```

---

### Task 7: Refactor all agents to return partial state

**Files:**
- Modify: `backend/src/agents/ceo.ts`
- Modify: `backend/src/agents/cto.ts`
- Modify: `backend/src/agents/product-owner.ts`
- Modify: `backend/src/agents/product-manager.ts`
- Modify: `backend/src/agents/business-marketing.ts`
- Modify: `backend/src/agents/engineer.ts`
- Modify: `backend/src/agents/designer.ts`
- Modify: `backend/src/agents/qa.ts`
- Modify: `backend/src/graph.ts` (withRetry)

Each agent currently returns `current_project: { ...state.current_project, specific_field: data }`.
After this task, each returns only the fields it owns. The merge reducer handles assembly.

- [ ] **Step 1: Update `withRetry` in `backend/src/graph.ts`**

The token accumulation logic reads from `result.current_project`. Since agents now return partial objects, we need to handle potentially-undefined fields. Replace the `withRetry` function (lines 16-96) with:

```ts
async function withRetry(
  agentName: string,
  agentFn: (state: CompanyStateType, emit: (e: AgentEvent) => void) => Promise<Partial<CompanyStateType>>,
  state: CompanyStateType,
  emit: (e: AgentEvent) => void
): Promise<Partial<CompanyStateType>> {
  let lastError: unknown = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await agentFn(state, emit);

      const agentEvents = result.agent_events ?? [];
      const tokenEvents = agentEvents.filter((e: AgentEvent) => e.status === "token_usage" && e.token_usage);
      const currentUsage = { ...(state.current_project.token_usage ?? {}) };
      let totalInput = state.current_project.total_input_tokens ?? 0;
      let totalOutput = state.current_project.total_output_tokens ?? 0;

      for (const te of tokenEvents) {
        const agent = te.agent;
        const tu = te.token_usage!;
        const prev = currentUsage[agent] ?? { input_tokens: 0, output_tokens: 0 };
        currentUsage[agent] = {
          input_tokens: prev.input_tokens + tu.input_tokens,
          output_tokens: prev.output_tokens + tu.output_tokens,
        };
        totalInput += tu.input_tokens;
        totalOutput += tu.output_tokens;
      }

      return {
        ...result,
        current_project: {
          ...(result.current_project ?? {}),
          retry_count: 0,
          failed_agent: null,
          token_usage: currentUsage,
          total_input_tokens: totalInput,
          total_output_tokens: totalOutput,
          total_tokens: totalInput + totalOutput,
        } as ProjectItem,
      };
    } catch (err) {
      lastError = err;
      if (attempt < MAX_RETRIES) {
        emit({
          agent: agentName as AgentEvent["agent"],
          phase: state.current_project.current_phase,
          status: "error",
          message: `Retry ${attempt + 1}/${MAX_RETRIES} — ${String(err).slice(0, 80)}`,
          timestamp: Date.now(),
        });
      }
    }
  }
  emit({
    agent: agentName as AgentEvent["agent"],
    phase: state.current_project.current_phase,
    status: "error",
    message: `Failed after ${MAX_RETRIES} retries: ${String(lastError).slice(0, 80)}`,
    timestamp: Date.now(),
  });
  return {
    current_project: {
      retry_count: (state.current_project.retry_count ?? 0) + 1,
      failed_agent: agentName,
      token_usage: state.current_project.token_usage ?? {},
      total_input_tokens: state.current_project.total_input_tokens ?? 0,
      total_output_tokens: state.current_project.total_output_tokens ?? 0,
      total_tokens: state.current_project.total_tokens ?? 0,
    } as ProjectItem,
  };
}
```

- [ ] **Step 2: Update `ceoIntake` return in `backend/src/agents/ceo.ts`**

Replace the final `return` block in `ceoIntake` (the block starting with `return {`) with:
```ts
  return {
    current_project: {
      status: data.accepted ? "accepted" : "rejected",
      complexity,
      ceo_decision: data,
    } as ProjectItem,
    agent_events: [
      {
        agent: "ceo" as const,
        phase: "intake" as const,
        status: "done" as const,
        message: data.accepted ? `Accepted - ${data.reasoning}` : `Rejected - ${data.reasoning}`,
        timestamp: Date.now(),
      },
    ],
    next_phase: data.accepted ? "planning" : ("delivered" as ProjectPhase),
  };
```

- [ ] **Step 3: Update `ctoAgent` return in `backend/src/agents/cto.ts`**

Replace the final `return` block with:
```ts
  return {
    current_project: {
      cto_output: data,
    } as ProjectItem,
    agent_events: [
      {
        agent: "cto" as const,
        phase: "planning" as const,
        status: "done" as const,
        message: `Tech stack selected: ${data.tech_stack.slice(0, 5).join(", ")}`,
        timestamp: Date.now(),
      },
    ],
  };
```

- [ ] **Step 4: Update `productOwnerAgent` return in `backend/src/agents/product-owner.ts`**

Replace the final `return` block with:
```ts
  return {
    current_project: {
      product_owner_output: data,
    } as ProjectItem,
    agent_events: [
      {
        agent: "product_owner" as const,
        phase: "planning" as const,
        status: "done" as const,
        message: `${data.user_stories.length} user stories created · Sprint: ${data.sprint_plan}`,
        timestamp: Date.now(),
      },
    ],
  };
```

- [ ] **Step 5: Update `productManagerAgent` in `backend/src/agents/product-manager.ts`**

Add CTO context to the human message and update return. Replace the `context` string and the `model.invoke` call and final `return`:

Replace:
```ts
  const model = getModel(0.4);
  const response = await model.invoke([
    new SystemMessage(SYSTEM),
    new HumanMessage(`Project: ${title}\n\nDescription: ${description}`),
  ]);
```

With:
```ts
  const ctoContext = project.cto_output.architecture
    ? `\n\nCTO Architecture: ${project.cto_output.architecture}\nTech Stack: ${project.cto_output.tech_stack.join(", ")}`
    : "";

  const model = getModel(0.4);
  const response = await model.invoke([
    new SystemMessage(SYSTEM),
    new HumanMessage(`Project: ${title}\n\nDescription: ${description}${ctoContext}`),
  ]);
```

Replace the final `return` block with:
```ts
  return {
    current_project: {
      product_manager_output: data,
    } as ProjectItem,
    agent_events: [
      {
        agent: "product_manager" as const,
        phase: "planning" as const,
        status: "done" as const,
        message: `${data.roadmap.length} roadmap milestones · ${data.feature_priority[0] ?? ""}`,
        timestamp: Date.now(),
      },
    ],
  };
```

Also add low-complexity early return after the `emit("thinking")` block:
```ts
  // Skip for low-complexity projects — PO output is sufficient
  if (project.complexity === "low") {
    emit({ agent: "product_manager", phase: "planning", status: "done", message: "Skipped (low complexity)", timestamp: Date.now() });
    return { current_project: { product_manager_output: FALLBACK_PM_OUTPUT } as ProjectItem, agent_events: [] };
  }
```

- [ ] **Step 6: Update `businessMarketingAgent` in `backend/src/agents/business-marketing.ts`**

Same pattern as PM. After the `emit("thinking")` block, add:
```ts
  if (project.complexity === "low") {
    emit({ agent: "business_marketing", phase: "planning", status: "done", message: "Skipped (low complexity)", timestamp: Date.now() });
    return { current_project: { business_marketing_output: FALLBACK_BM_OUTPUT } as ProjectItem, agent_events: [] };
  }
```

Add CTO context to the human message (same as PM step):
```ts
  const ctoContext = project.cto_output.architecture
    ? `\n\nCTO Architecture: ${project.cto_output.architecture}\nTech Stack: ${project.cto_output.tech_stack.join(", ")}`
    : "";

  const model = getModel(0.5);
  const response = await model.invoke([
    new SystemMessage(SYSTEM),
    new HumanMessage(`Project: ${title}\n\nDescription: ${description}${ctoContext}`),
  ]);
```

Replace final `return` block with:
```ts
  return {
    current_project: {
      business_marketing_output: data,
    } as ProjectItem,
    agent_events: [
      {
        agent: "business_marketing" as const,
        phase: "planning" as const,
        status: "done" as const,
        message: `GTM: ${data.go_to_market[0] ?? ""} · KPIs: ${data.kpis[0] ?? ""}`,
        timestamp: Date.now(),
      },
    ],
  };
```

- [ ] **Step 7: Update `engineerAgent` in `backend/src/agents/engineer.ts`**

Add PO + PM context to the existing `context` string. Find:
```ts
  const context = `
CTO Architecture Decision:
- Architecture: ${ctoOutput.architecture}
- Tech Stack: ${ctoOutput.tech_stack.join(", ")}
- System Design: ${ctoOutput.system_design}
- Technical Risks: ${ctoOutput.technical_risks.join(" | ")}

Project: ${project.project_title}
Description: ${project.project_description}
  `.trim();
```

Replace with:
```ts
  const poStories = project.product_owner_output.user_stories
    .slice(0, 5)
    .map((s) => `- As a ${s.as}, I want ${s.want}`)
    .join("\n");
  const pmPriority = project.product_manager_output.feature_priority.join(", ");

  const context = `
CTO Architecture Decision:
- Architecture: ${ctoOutput.architecture}
- Tech Stack: ${ctoOutput.tech_stack.join(", ")}
- System Design: ${ctoOutput.system_design}
- Technical Risks: ${ctoOutput.technical_risks.join(" | ")}

Product Owner — Top User Stories:
${poStories || "Not available"}

Product Manager — Feature Priority:
${pmPriority || "Not available"}

Project: ${project.project_title}
Description: ${project.project_description}
  `.trim();
```

Replace final `return` block with:
```ts
  return {
    current_project: {
      engineer_output: data,
    } as ProjectItem,
    agent_events: [
      {
        agent: "engineer" as const,
        phase: "execution" as const,
        status: "done" as const,
        message: `Implementation plan: ${data.implementation_plan.length} steps`,
        timestamp: Date.now(),
      },
    ],
  };
```

- [ ] **Step 8: Update `designerAgent` return in `backend/src/agents/designer.ts`**

Replace the final `return` block with:
```ts
  return {
    current_project: {
      designer_output: data,
    } as ProjectItem,
    agent_events: [
      {
        agent: "designer" as const,
        phase: "execution" as const,
        status: "done" as const,
        message: `${data.deliverables.length} design deliverables planned`,
        timestamp: Date.now(),
      },
    ],
  };
```

- [ ] **Step 9: Update `qaAgent` return in `backend/src/agents/qa.ts`**

Replace the final `return` block with:
```ts
  return {
    current_project: {
      qa_output: data,
    } as ProjectItem,
    agent_events: [
      {
        agent: "qa" as const,
        phase: "quality" as const,
        status: "done" as const,
        message: `QA Plan: ${data.test_plan.slice(0, 60)}...`,
        timestamp: Date.now(),
      },
    ],
  };
```

- [ ] **Step 10: Verify TypeScript compiles**

```bash
cd backend && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 11: Commit**

```bash
git add backend/src/agents/ceo.ts backend/src/agents/cto.ts backend/src/agents/product-owner.ts \
  backend/src/agents/product-manager.ts backend/src/agents/business-marketing.ts \
  backend/src/agents/engineer.ts backend/src/agents/designer.ts backend/src/agents/qa.ts \
  backend/src/graph.ts
git commit -m "refactor: agents return partial state for merge-reducer compatibility"
```

---

### Task 8: Parallelize planning agents + replace CEO review

**Files:**
- Modify: `backend/src/graph.ts`
- Modify: `backend/src/agents/ceo.ts`

- [ ] **Step 1: Replace `ceoReview` with deterministic review in `backend/src/agents/ceo.ts`**

Delete the entire `ceoReview` export function and replace with:

```ts
export function deterministicReview(
  state: CompanyStateType,
  emit: (event: AgentEvent) => void
): Partial<CompanyStateType> {
  const p = state.current_project;
  const allDone =
    p.engineer_output.implementation_plan.length > 0 &&
    p.designer_output.wireframes.length > 0 &&
    p.qa_output.test_cases.length > 0;

  const review = allDone
    ? { approved: true, feedback: "All phases completed successfully", launch_decision: "ready_for_deployment" }
    : { approved: false, feedback: "One or more phases produced no output", launch_decision: "needs_revision" };

  emit({
    agent: "ceo",
    phase: "review",
    status: "done",
    message: review.approved ? "APPROVED for launch" : "NEEDS REVISION",
    timestamp: Date.now(),
  });

  return {
    current_project: { ceo_review: review } as ProjectItem,
    agent_events: [
      {
        agent: "ceo" as const,
        phase: "review" as const,
        status: "done" as const,
        message: review.approved ? `Approved - ${review.feedback}` : `Needs revision - ${review.feedback}`,
        timestamp: Date.now(),
      },
    ],
  };
}
```

- [ ] **Step 2: Update `graph.ts` imports and nodes**

At the top of `backend/src/graph.ts`, change:
```ts
import { ceoIntake, ceoReview } from "./agents/ceo.js";
```
to:
```ts
import { ceoIntake, deterministicReview } from "./agents/ceo.js";
```

- [ ] **Step 3: Rewire graph edges for parallelization in `buildGraph`**

Replace the full `// ── Edges` section (everything from `// ── Edges` to `return graph.compile()`) with:

```ts
  // ── Edges ───────────────────────────────────────────────────────────────────

  // START → ceo_intake
  graph.addEdge(START, "ceo_intake");

  // CEO intake → planning_checkpoint or finalize
  graph.addConditionalEdges(
    "ceo_intake",
    (state: CompanyStateType) => {
      if (state.current_project.status === "rejected") return "finalize";
      if (state.next_phase === "intake") return "finalize";
      return "planning_checkpoint";
    },
    { finalize: "finalize", planning_checkpoint: "planning_checkpoint" }
  );

  // Planning checkpoint → rejected goes to finalize, accepted fans-out to CTO
  graph.addConditionalEdges(
    "planning_checkpoint",
    (state: CompanyStateType) => {
      if (state.current_project.status === "rejected") return "finalize";
      return "cto";
    },
    { finalize: "finalize", cto: "cto" }
  );

  // CTO fans-out to PO + PM + BM in parallel
  graph.addEdge("cto", "product_owner");
  graph.addEdge("cto", "product_manager");
  graph.addEdge("cto", "business_marketing");

  // All three fan-in to execution_checkpoint
  graph.addEdge("product_owner", "execution_checkpoint");
  graph.addEdge("product_manager", "execution_checkpoint");
  graph.addEdge("business_marketing", "execution_checkpoint");

  // Execution checkpoint → fans-out engineer + designer in parallel
  graph.addConditionalEdges(
    "execution_checkpoint",
    (_state: CompanyStateType) => "run",
    { run: "engineer" }
  );
  // Designer also runs in parallel with engineer after execution_checkpoint
  graph.addEdge("execution_checkpoint", "designer");

  // Both engineer and designer fan-in to qa
  graph.addEdge("engineer", "qa");
  graph.addEdge("designer", "qa");

  // QA → deterministic review → finalize → END
  graph.addEdge("qa", "ceo_review");
  graph.addEdge("ceo_review", "finalize");
  graph.addEdge("finalize", END);

  return graph.compile();
```

Also update the `ceo_review` node registration — change:
```ts
graph.addNode("ceo_review", (state: CompanyStateType) => ceoReview(state, emit));
```
to:
```ts
graph.addNode("ceo_review", (state: CompanyStateType) => deterministicReview(state, emit));
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd backend && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 5: Smoke test the server starts**

```bash
cd backend && npm run dev &
sleep 3
curl -s http://localhost:3001/health
kill %1
```
Expected: `{"status":"ok"}`

- [ ] **Step 6: Commit**

```bash
git add backend/src/graph.ts backend/src/agents/ceo.ts
git commit -m "feat: parallelize PO+PM+BM and Engineer+Designer, replace CEO review with deterministic check"
```

---

### Task 9: Parallelize Engineer + Designer (graph edge fix)

> **Note:** The graph in Task 8 has a structural issue — `execution_checkpoint` uses `addConditionalEdges` for `engineer` AND `addEdge` for `designer`. LangGraph may not support mixing these from the same node. Fix by using a dedicated routing node.

**Files:**
- Modify: `backend/src/graph.ts`

- [ ] **Step 1: Add `execution_router` node and rewire execution phase**

In `buildGraph`, after the `execution_checkpoint` node, add:
```ts
graph.addNode("execution_router", (_state: CompanyStateType) => ({}));
```

Then replace the execution_checkpoint edges section:
```ts
  // Execution checkpoint → execution_router → [engineer || designer] in parallel
  graph.addConditionalEdges(
    "execution_checkpoint",
    (_state: CompanyStateType) => "execution_router",
    { execution_router: "execution_router" }
  );
  graph.addEdge("execution_router", "engineer");
  graph.addEdge("execution_router", "designer");

  // Both fan-in to qa
  graph.addEdge("engineer", "qa");
  graph.addEdge("designer", "qa");
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd backend && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add backend/src/graph.ts
git commit -m "fix: use execution_router node for clean engineer+designer fan-out"
```

---

### Task 10: Environment variables documentation + .env.example update

**Files:**
- Modify: `backend/.env.example`

- [ ] **Step 1: Update `.env.example` with new variables**

Read current `.env.example` and add missing variables:
```bash
cat backend/.env.example
```

Add any missing lines so the file contains:
```
# LLM Provider
LLM_PROVIDER=openai
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-4o-mini
OPENAI_BASE_URL=

ANTHROPIC_MODEL=claude-sonnet-4-20250514

# Auth (leave empty for open access in dev)
API_KEY=

# CORS (use * for dev, set domain for prod)
CORS_ORIGIN=*

# Rate limiting
WS_RATE_MAX=30
WS_RATE_WINDOW_MS=60000

# Graph timeout in ms (default 5 min)
GRAPH_TIMEOUT_MS=300000

# Persistence
DB_PATH=./data/projects.json
```

- [ ] **Step 2: Final TypeScript + test check**

```bash
cd backend && npx tsc --noEmit && npx vitest run
```
Expected: all tests pass, no type errors.

- [ ] **Step 3: Commit**

```bash
git add backend/.env.example
git commit -m "docs: update .env.example with all new env variables"
```

---

## Self-Review

### Spec coverage

| Requirement | Task |
|-------------|------|
| Persistence — no data loss on restart | Task 1 |
| API key auth on REST | Task 2, Task 5 |
| API key auth on WebSocket | Task 2, Task 5 |
| Rate limiting REST | Task 3, Task 5 |
| Rate limiting WebSocket | Task 3, Task 5 |
| Input validation (length caps) | Task 4, Task 5 |
| Graph timeout | Task 5 |
| Full UUID (no slice) | Task 5 |
| Path traversal fix on download endpoint | Task 5 |
| State merge reducer | Task 6 |
| Agents return partial state | Task 7 |
| Low-complexity fast path (PM/BM skip) | Task 7 |
| Better context between agents | Task 7 |
| PO+PM+BM run in parallel | Task 8 |
| CEO review replaced with deterministic | Task 8 |
| Engineer+Designer run in parallel | Task 9 |
| ENV vars documented | Task 10 |

### Known gaps / future work
- No database migration system (flat JSON file, swappable for PostgreSQL later)
- No horizontal scaling (still single-process WebSocket broadcasts)
- No Sentry/Datadog error monitoring
- `is_running` flag not crash-safe (server restart leaves projects stuck — add startup cleanup if needed)
