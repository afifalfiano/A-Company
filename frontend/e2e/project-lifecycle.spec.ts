import { test, expect } from "@playwright/test";
import { makeProject, setupWsMock, wsSend } from "./helpers";

// WS mock tests share the same Vite dev server; run serially to avoid
// Playwright routing cross-contamination when workers > 1.
test.describe.configure({ mode: "serial" });

// Mock the projects REST fetch on every test
test.beforeEach(async ({ page }) => {
  await page.route("http://localhost:3001/projects", (route) =>
    route.fulfill({ json: { projects: [] } }),
  );
});

// ─── Form validation ──────────────────────────────────────────────────────────

test("submit button is disabled without required fields", async ({ page }) => {
  await page.routeWebSocket("ws://localhost:3001", (ws) => setupWsMock(ws, {}));
  await page.goto("/");

  const submitBtn = page.getByRole("button", { name: /process project/i });
  await expect(submitBtn).toBeDisabled();

  await page.getByPlaceholder("Project title (required)").fill("My App");
  await expect(submitBtn).toBeDisabled(); // still disabled — no features

  await page.getByPlaceholder(/key features/i).fill("dashboard, auth");
  await expect(submitBtn).toBeEnabled();
});

test("clearing title re-disables the submit button", async ({ page }) => {
  await page.routeWebSocket("ws://localhost:3001", (ws) => setupWsMock(ws, {}));
  await page.goto("/");

  const submitBtn = page.getByRole("button", { name: /process project/i });
  await page.getByPlaceholder("Project title (required)").fill("My App");
  await page.getByPlaceholder(/key features/i).fill("dashboard");
  await expect(submitBtn).toBeEnabled();

  // Remove title → disabled again
  await page.getByPlaceholder("Project title (required)").clear();
  await expect(submitBtn).toBeDisabled();
});

// ─── Project submission ───────────────────────────────────────────────────────

test("submitting a project saves it as pending — no auto-run", async ({ page }) => {
  const project = makeProject();

  await page.routeWebSocket("ws://localhost:3001", (ws) =>
    setupWsMock(ws, {
      process_project: (_payload, ws) => {
        wsSend(ws, "processing_start", { project });
        wsSend(ws, "processing_done", { project });
        wsSend(ws, "project_update", { project });
      },
    }),
  );

  await page.goto("/");
  await page.getByPlaceholder("Project title (required)").fill("Landing Page");
  await page.getByPlaceholder(/key features/i).fill("hero section, pricing");
  await page.getByRole("button", { name: /process project/i }).click();

  // Card appears
  await expect(page.getByText("Landing Page")).toBeVisible();

  // "Start Planning" shows — no auto-processing
  await expect(page.getByRole("button", { name: /start planning/i })).toBeVisible();

  // No approve/reject/execution buttons yet
  await expect(page.getByRole("button", { name: /✓ approve/i })).not.toBeVisible();
  await expect(page.getByRole("button", { name: /start execution/i })).not.toBeVisible();
});

test("clicking an example fills the form", async ({ page }) => {
  await page.routeWebSocket("ws://localhost:3001", (ws) => setupWsMock(ws, {}));
  await page.goto("/");

  await page.getByRole("button", { name: /landing page/i }).first().click();

  await expect(page.getByPlaceholder("Project title (required)")).toHaveValue(
    "Landing page",
  );
  await expect(page.getByPlaceholder(/key features/i)).not.toHaveValue("");
});

// ─── Planning phase ───────────────────────────────────────────────────────────

test("Start Planning runs CEO + agents and shows approve/reject when done", async ({ page }) => {
  const project = makeProject();

  let planningDone: () => void;
  const planningFinished = new Promise<void>((r) => (planningDone = r));

  await page.routeWebSocket("ws://localhost:3001", (ws) =>
    setupWsMock(ws, {
      process_project: (_p, ws) => {
        wsSend(ws, "processing_start", { project });
        wsSend(ws, "processing_done", { project });
        wsSend(ws, "project_update", { project });
      },
      start_planning: (_p, ws) => {
        // CEO intake
        const intaking = makeProject({ status: "in_progress", current_phase: "intake", is_running: true });
        wsSend(ws, "phase_start", { project: intaking, phase: "intake" });
        wsSend(ws, "agent_event", { agent: "ceo", phase: "intake", status: "done", message: "ACCEPTED · Priority: MEDIUM", timestamp: Date.now() });

        // Planning agents
        const planning = makeProject({ status: "in_progress", current_phase: "planning", is_running: true });
        wsSend(ws, "phase_start", { project: planning, phase: "planning" });
        for (const agent of ["cto", "product_owner", "product_manager", "business_marketing"]) {
          wsSend(ws, "agent_event", { agent, phase: "planning", status: "done", message: `${agent} complete`, timestamp: Date.now() });
        }

        // Planning complete — awaiting approval
        const planningComplete = makeProject({
          status: "in_progress",
          current_phase: "planning",
          is_running: false,
          ceo_decision: { accepted: true, priority: "medium", reasoning: "Feasible", resource_allocation: "medium" },
          cto_output: { architecture: "SPA", tech_stack: ["React", "TypeScript"], system_design: "Frontend only", technical_risks: [] },
        });
        wsSend(ws, "processing_done", { project: planningComplete });
        wsSend(ws, "project_update", { project: planningComplete });
        planningDone();
      },
    }),
  );

  await page.goto("/");
  await page.getByPlaceholder("Project title (required)").fill("Landing Page");
  await page.getByPlaceholder(/key features/i).fill("hero section, pricing");
  await page.getByRole("button", { name: /process project/i }).click();
  await expect(page.getByText("Landing Page")).toBeVisible();

  await page.getByRole("button", { name: /start planning/i }).click();
  await planningFinished;

  // Approve/Reject visible
  await expect(page.getByRole("button", { name: /✓ approve/i })).toBeVisible({ timeout: 3000 });
  await expect(page.getByRole("button", { name: /✗ reject/i })).toBeVisible();

  // Start Planning gone
  await expect(page.getByRole("button", { name: /start planning/i })).not.toBeVisible();
});

test("CEO rejection shows rejected state, no further actions", async ({ page }) => {
  const project = makeProject();

  let rejectedDone: () => void;
  const rejectedFinished = new Promise<void>((r) => (rejectedDone = r));

  await page.routeWebSocket("ws://localhost:3001", (ws) =>
    setupWsMock(ws, {
      process_project: (_p, ws) => {
        wsSend(ws, "processing_start", { project });
        wsSend(ws, "processing_done", { project });
        wsSend(ws, "project_update", { project });
      },
      start_planning: (_p, ws) => {
        const rejected = makeProject({
          status: "rejected",
          current_phase: "intake",
          is_running: false,
          ceo_decision: { accepted: false, priority: "low", reasoning: "Not viable", resource_allocation: "none" },
        });
        wsSend(ws, "processing_done", { project: rejected });
        wsSend(ws, "project_update", { project: rejected });
        rejectedDone();
      },
    }),
  );

  await page.goto("/");
  await page.getByPlaceholder("Project title (required)").fill("Bad Idea");
  await page.getByPlaceholder(/key features/i).fill("something illegal");
  await page.getByRole("button", { name: /process project/i }).click();
  await page.getByRole("button", { name: /start planning/i }).click();
  await rejectedFinished;

  await expect(page.getByText(/rejected/i)).toBeVisible({ timeout: 3000 });
  await expect(page.getByRole("button", { name: /✓ approve/i })).not.toBeVisible();
  await expect(page.getByRole("button", { name: /start execution/i })).not.toBeVisible();
});

// ─── Approval gate ────────────────────────────────────────────────────────────

test("approving planning shows Start Execution button", async ({ page }) => {
  // Pre-load a project already in planning-complete state
  const planningComplete = makeProject({
    status: "in_progress",
    current_phase: "planning",
    is_running: false,
    planning_approved: false,
    ceo_decision: { accepted: true, priority: "medium", reasoning: "ok", resource_allocation: "medium" },
    cto_output: { architecture: "SPA", tech_stack: ["React"], system_design: "", technical_risks: [] },
  });

  await page.route("http://localhost:3001/projects", (route) =>
    route.fulfill({ json: { projects: [planningComplete] } }),
  );

  await page.routeWebSocket("ws://localhost:3001", (ws) =>
    setupWsMock(ws, {
      approve_planning: (_p, ws) => {
        const approved = makeProject({ ...planningComplete, planning_approved: true });
        wsSend(ws, "project_update", { project: approved });
      },
    }),
  );

  await page.goto("/");

  await expect(page.getByRole("button", { name: /✓ approve/i })).toBeVisible({ timeout: 3000 });
  await page.getByRole("button", { name: /✓ approve/i }).click();

  await expect(page.getByRole("button", { name: /start execution/i })).toBeVisible({ timeout: 3000 });
  await expect(page.getByRole("button", { name: /✓ approve/i })).not.toBeVisible();
});

test("rejecting planning keeps the project in planning, hides execution", async ({ page }) => {
  const planningComplete = makeProject({
    status: "in_progress",
    current_phase: "planning",
    is_running: false,
    planning_approved: false,
  });

  await page.route("http://localhost:3001/projects", (route) =>
    route.fulfill({ json: { projects: [planningComplete] } }),
  );

  await page.routeWebSocket("ws://localhost:3001", (ws) =>
    setupWsMock(ws, {
      approve_planning: (_p, ws) => {
        const rejected = makeProject({ ...planningComplete, planning_approved: false });
        wsSend(ws, "project_update", { project: rejected });
      },
    }),
  );

  await page.goto("/");
  await expect(page.getByRole("button", { name: /✗ reject/i })).toBeVisible({ timeout: 3000 });
  await page.getByRole("button", { name: /✗ reject/i }).click();

  await expect(page.getByRole("button", { name: /start execution/i })).not.toBeVisible();
});

// ─── Full lifecycle ───────────────────────────────────────────────────────────

test("full lifecycle: submit → plan → approve → execute → done with code", async ({ page }) => {
  const base = makeProject();

  await page.routeWebSocket("ws://localhost:3001", (ws) =>
    setupWsMock(ws, {
      process_project: (_p, ws) => {
        wsSend(ws, "processing_start", { project: base });
        wsSend(ws, "processing_done", { project: base });
        wsSend(ws, "project_update", { project: base });
      },
      start_planning: (_p, ws) => {
        const planningComplete = makeProject({
          status: "in_progress",
          current_phase: "planning",
          is_running: false,
          ceo_decision: { accepted: true, priority: "medium", reasoning: "ok", resource_allocation: "medium" },
          cto_output: { architecture: "SPA", tech_stack: ["React"], system_design: "", technical_risks: [] },
        });
        wsSend(ws, "processing_done", { project: planningComplete });
        wsSend(ws, "project_update", { project: planningComplete });
      },
      approve_planning: (_p, ws) => {
        const approved = makeProject({
          status: "in_progress",
          current_phase: "planning",
          is_running: false,
          planning_approved: true,
          ceo_decision: { accepted: true, priority: "medium", reasoning: "ok", resource_allocation: "medium" },
        });
        wsSend(ws, "project_update", { project: approved });
      },
      start_execution: (_p, ws) => {
        const done = makeProject({
          status: "done",
          current_phase: "delivered",
          is_running: false,
          planning_approved: true,
          generated_code: {
            generated_at: Date.now(),
            mode: "monolith",
            file_count: 12,
            zip_path: "/generated/test/test.zip",
          },
          ceo_review: { approved: true, feedback: "Looks great", launch_decision: "ready_for_deployment" },
        });
        wsSend(ws, "processing_done", { project: done });
        wsSend(ws, "project_update", { project: done });
      },
    }),
  );

  await page.goto("/");

  // 1. Submit
  await page.getByPlaceholder("Project title (required)").fill("Landing Page");
  await page.getByPlaceholder(/key features/i).fill("hero section, pricing");
  await page.getByRole("button", { name: /process project/i }).click();
  await expect(page.getByText("Landing Page")).toBeVisible();
  await expect(page.getByRole("button", { name: /start planning/i })).toBeVisible();

  // 2. Plan
  await page.getByRole("button", { name: /start planning/i }).click();
  await expect(page.getByRole("button", { name: /✓ approve/i })).toBeVisible({ timeout: 5000 });

  // 3. Approve
  await page.getByRole("button", { name: /✓ approve/i }).click();
  await expect(page.getByRole("button", { name: /start execution/i })).toBeVisible({ timeout: 3000 });

  // 4. Execute
  await page.getByRole("button", { name: /start execution/i }).click();

  // 5. Done — file count and download link
  await expect(page.getByText(/12 files/)).toBeVisible({ timeout: 5000 });
  await expect(page.getByText(/📦 Download/)).toBeVisible();
});
