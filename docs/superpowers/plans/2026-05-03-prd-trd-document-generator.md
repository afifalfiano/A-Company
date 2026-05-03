# PRD/TRD Document Generator Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans or superpowers:subagent-driven-development to implement task-by-task.

**Goal:** Add download buttons for PRD and TRD documents inside project detail modal.

**Architecture:** Frontend-only. Client-side markdown generation from existing `ProjectItem` data. No backend changes needed. Two new utility functions + two download buttons in `ProjectDetail` header.

**Tech Stack:** Pure TypeScript, no new dependencies.

---

## File Structure

- Create: `frontend/src/utils/documentGenerator.ts` — PRD/TRD markdown generators
- Modify: `frontend/src/components/ProjectDetail.tsx:96-127` — add download buttons to modal header

---

### Task 1: Create document generator utility

**File:**
- Create: `frontend/src/utils/documentGenerator.ts`

- [ ] **Step 1: Write documentGenerator.ts**

```typescript
// frontend/src/utils/documentGenerator.ts

import type { ProjectItem } from "../models";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renderList(items: unknown[]): string {
  if (!items?.length) return "";
  return items.map((item) => {
    if (typeof item === "object" && item !== null) {
      return `- ${JSON.stringify(item)}`;
    }
    return `- ${String(item)}`;
  }).join("\n");
}

function section(emoji: string, title: string, body: string): string {
  return `## ${emoji} ${title}\n\n${body}\n\n`;
}

// ─── PRD Generator ────────────────────────────────────────────────────────────

export function generatePRD(project: ProjectItem): string {
  const parts: string[] = [];

  // Title block
  parts.push(`# Product Requirements Document (PRD)\n`);
  parts.push(`**Project:** ${project.project_title}\n`);
  parts.push(`**Date:** ${new Date().toISOString().split("T")[0]}\n`);
  parts.push(`**Phase:** ${project.current_phase}\n`);
  parts.push(`**Priority:** ${project.ceo_decision.priority}\n`);
  parts.push(`**Status:** ${project.status}\n\n`);
  parts.push("---\n\n");

  // Executive Summary
  if (project.project_description) {
    parts.push(section("📋", "Executive Summary", project.project_description));
  }

  // CEO Decision
  parts.push(section("👔", "CEO Decision", [
    `**Accepted:** ${project.ceo_decision.accepted ? "Yes" : "No"}`,
    `**Priority:** ${project.ceo_decision.priority}`,
    `**Resource Allocation:** ${project.ceo_decision.resource_allocation}`,
    project.ceo_decision.reasoning ? `\n**Reasoning:** ${project.ceo_decision.reasoning}` : "",
  ].filter(Boolean).join("\n\n")));

  // CTO Output
  if (project.cto_output.architecture || project.cto_output.tech_stack?.length) {
    const ctoBody = [
      `### Architecture`,
      project.cto_output.architecture,
      ``,
      `### Tech Stack`,
      renderList(project.cto_output.tech_stack),
      ``,
      `### System Design`,
      project.cto_output.system_design,
      ``,
      `### Technical Risks`,
      renderList(project.cto_output.technical_risks),
    ].join("\n");
    parts.push(section("🏗️", "CTO — Architecture & Tech Stack", ctoBody));
  }

  // Product Owner
  if (project.product_owner_output.user_stories?.length || project.product_owner_output.backlog?.length) {
    const poBody = [
      `### User Stories`,
      ...(project.product_owner_output.user_stories ?? []).map((us, i) =>
        `${i + 1}. **As a** ${us.as} — **want** ${us.want} — **so that** ${us.so}\n   Acceptance: ${(us.acceptance ?? []).join(", ") || "none"}`
      ),
      ``,
      `### Backlog`,
      renderList(project.product_owner_output.backlog),
      ``,
      `### Sprint Plan`,
      project.product_owner_output.sprint_plan,
    ].join("\n");
    parts.push(section("📦", "Product Owner — User Stories & Backlog", poBody));
  }

  // Product Manager
  if (project.product_manager_output.strategy || project.product_manager_output.roadmap?.length) {
    const pmBody = [
      `### Strategy`,
      project.product_manager_output.strategy,
      ``,
      `### Roadmap`,
      renderList(project.product_manager_output.roadmap),
      ``,
      `### Feature Priority`,
      renderList(project.product_manager_output.feature_priority),
      ``,
      `### Competitive Analysis`,
      project.product_manager_output.competitive_analysis,
    ].join("\n");
    parts.push(section("🎯", "Product Manager — Strategy & Roadmap", pmBody));
  }

  // Business & Marketing
  if (project.business_marketing_output.market_analysis || project.business_marketing_output.go_to_market?.length) {
    const bmBody = [
      `### Market Analysis`,
      project.business_marketing_output.market_analysis,
      ``,
      `### Go-to-Market`,
      renderList(project.business_marketing_output.go_to_market),
      ``,
      `### Pricing Strategy`,
      project.business_marketing_output.pricing_strategy,
      ``,
      `### KPIs`,
      renderList(project.business_marketing_output.kpis),
    ].join("\n");
    parts.push(section("📈", "Business & Marketing", bmBody));
  }

  parts.push("---\n");
  parts.push(`*Generated by A-Company AI Agent System*\n");

  return parts.join("");
}

// ─── TRD Generator ──────────────────────────────────────────────────────────

export function generateTRD(project: ProjectItem): string {
  const parts: string[] = [];

  parts.push(`# Technical Requirements Document (TRD)\n`);
  parts.push(`**Project:** ${project.project_title}\n`);
  parts.push(`**Date:** ${new Date().toISOString().split("T")[0]}\n`);
  parts.push(`**Phase:** ${project.current_phase}\n\n`);
  parts.push("---\n\n");

  // CTO Output
  if (project.cto_output.architecture || project.cto_output.tech_stack?.length) {
    const ctoBody = [
      `### Architecture`,
      project.cto_output.architecture,
      ``,
      `### Tech Stack`,
      renderList(project.cto_output.tech_stack),
      ``,
      `### System Design`,
      project.cto_output.system_design,
      ``,
      `### Technical Risks`,
      renderList(project.cto_output.technical_risks),
    ].join("\n");
    parts.push(section("🏗️", "CTO — Architecture & Technical Decisions", ctoBody));
  }

  // Engineer Output
  if (project.engineer_output.implementation_plan?.length || project.engineer_output.code_structure) {
    const engBody = [
      `### Implementation Plan`,
      renderList(project.engineer_output.implementation_plan),
      ``,
      `### Code Structure`,
      project.engineer_output.code_structure,
      ``,
      `### Estimates`,
      project.engineer_output.estimates
        ? Object.entries(project.engineer_output.estimates).map(([k, v]) => `- **${k}:** ${v}`).join("\n")
        : "",
      ``,
      `### Dependencies`,
      renderList(project.engineer_output.dependencies),
    ].join("\n");
    parts.push(section("⚙️", "Engineer — Implementation Plan", engBody));
  }

  // Designer Output
  if (project.designer_output.wireframes?.length || project.designer_output.design_system) {
    const desBody = [
      `### Wireframes`,
      renderList(project.designer_output.wireframes),
      ``,
      `### Design System`,
      project.designer_output.design_system,
      ``,
      `### UX Flows`,
      renderList(project.designer_output.ux_flows),
      ``,
      `### Deliverables`,
      renderList(project.designer_output.deliverables),
    ].join("\n");
    parts.push(section("🎨", "Designer — UI/UX Deliverables", desBody));
  }

  // QA Output
  if (project.qa_output.test_plan || project.qa_output.test_cases?.length) {
    const qaBody = [
      `### Test Plan`,
      project.qa_output.test_plan,
      ``,
      `### Test Cases`,
      ...(project.qa_output.test_cases ?? []).map((tc, i) =>
        `${i + 1}. **${tc.name}** (${tc.type})\n   Steps: ${(tc.steps ?? []).join(" → ")}`
      ).join("\n\n"),
      ``,
      `### Quality Gates`,
      renderList(project.qa_output.quality_gates),
      ``,
      `### Bug Risks`,
      renderList(project.qa_output.bug_risks),
    ].join("\n");
    parts.push(section("🧪", "QA — Test Plan & Quality Gates", qaBody));
  }

  parts.push("---\n");
  parts.push(`*Generated by A-Company AI Agent System*\n`);

  return parts.join("");
}
```

---

### Task 2: Add download buttons to ProjectDetail modal

**Files:**
- Modify: `frontend/src/components/ProjectDetail.tsx:96-127` (header section)
- Create: `frontend/src/utils/documentGenerator.ts`

- [ ] **Step 1: Import generators in ProjectDetail.tsx**

In `ProjectDetail.tsx`, add import at top:
```typescript
import { generatePRD, generateTRD } from "../utils/documentGenerator";
```

- [ ] **Step 2: Add download icon and handlers in header**

Find the header div ending at line ~126 (after the `</div>` closing project title row). Add download buttons before the Close button:

```tsx
<div style={{ display: "flex", gap: "6px" }}>
  <button
    onClick={() => {
      const blob = new Blob([generatePRD(project)], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${project.project_title.replace(/\s+/g, "-").toLowerCase()}-PRD.md`;
      a.click();
      URL.revokeObjectURL(url);
    }}
    style={{
      background: "#222232", border: "1px solid #2a2a3a",
      color: "#EF9F27", borderRadius: "8px",
      padding: "6px 12px", cursor: "pointer", fontSize: "12px",
      display: "flex", alignItems: "center", gap: "4px",
    }}
    title="Download PRD"
  >
    📥 PRD
  </button>
  <button
    onClick={() => {
      const blob = new Blob([generateTRD(project)], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${project.project_title.replace(/\s+/g, "-").toLowerCase()}-TRD.md`;
      a.click();
      URL.revokeObjectURL(url);
    }}
    style={{
      background: "#222232", border: "1px solid #2a2a3a",
      color: "#378ADD", borderRadius: "8px",
      padding: "6px 12px", cursor: "pointer", fontSize: "12px",
      display: "flex", alignItems: "center", gap: "4px",
    }}
    title="Download TRD"
  >
    📥 TRD
  </button>
</div>
```

- [ ] **Step 3: TypeScript check**

Run: `rtk npx tsc --noEmit`
Expected: No errors

---

## Self-Review Checklist

1. **Spec coverage:** PRD uses CEO + CTO + PO + PM + BM (all planning agents). TRD uses CTO + Engineer. ✓
2. **No placeholders:** All content uses actual `ProjectItem` field references. No TODOs. ✓
3. **Type consistency:** All field names match `models.ts` interfaces exactly (`cto_output.architecture`, `product_owner_output.user_stories`, `engineer_output.implementation_plan`, etc.) ✓
4. **No backend changes needed** — frontend-only. ✓
5. **Download not auto-export** — user clicks icon button to download. ✓
6. **Download format** — `.md` markdown file, proper filename. ✓

---

## Execution Options

**1. Subagent-Driven (recommended)** — dispatch one task at a time, fresh subagent per step

**2. Inline Execution** — execute both tasks in this session using executing-plans

Which approach?