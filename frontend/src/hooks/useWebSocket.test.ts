import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useWebSocket } from "../hooks/useWebSocket";
import { mockSend, mockClose, mockWsInstance, MockWebSocket } from "../test/setupWebSocket";

describe("useWebSocket", () => {
  beforeEach(() => {
    mockSend.mockClear();
    mockClose.mockClear();
    mockWsInstance.onopen = null;
    mockWsInstance.onclose = null;
    mockWsInstance.onmessage = null;
    mockWsInstance.onerror = null;
  });

  it("connects to WebSocket on mount", () => {
    renderHook(() => useWebSocket("ws://localhost:3001"));
    expect(MockWebSocket).toHaveBeenCalledWith("ws://localhost:3001");
  });

  it("sets connected true when socket opens", async () => {
    const { result } = renderHook(() => useWebSocket("ws://localhost:3001"));
    act(() => {
      mockWsInstance.onopen?.({} as Event);
    });
    await waitFor(() => {
      expect(result.current.connected).toBe(true);
    });
  });

  it("sends process_project message", async () => {
    const { result } = renderHook(() => useWebSocket("ws://localhost:3001"));
    act(() => {
      result.current.sendProject("Test Project", "Description");
    });
    await waitFor(() => {
      expect(mockSend).toHaveBeenCalledWith(
        JSON.stringify({ type: "process_project", payload: { title: "Test Project", description: "Description" } })
      );
    });
  });

  it("sends start_planning message", async () => {
    const { result } = renderHook(() => useWebSocket("ws://localhost:3001"));
    act(() => {
      result.current.startPlanning("proj-123");
    });
    await waitFor(() => {
      expect(mockSend).toHaveBeenCalledWith(
        JSON.stringify({ type: "start_planning", payload: { project_id: "proj-123" } })
      );
    });
  });

  it("sends approve_planning with approve=true", async () => {
    const { result } = renderHook(() => useWebSocket("ws://localhost:3001"));
    act(() => {
      result.current.approvePlanning("proj-123", true, "Looks good");
    });
    await waitFor(() => {
      expect(mockSend).toHaveBeenCalledWith(
        JSON.stringify({ type: "approve_planning", payload: { project_id: "proj-123", approve: true, notes: "Looks good" } })
      );
    });
  });

  it("sends approve_execution with approve=false", async () => {
    const { result } = renderHook(() => useWebSocket("ws://localhost:3001"));
    act(() => {
      result.current.approveExecution("proj-123", false);
    });
    await waitFor(() => {
      expect(mockSend).toHaveBeenCalledWith(
        JSON.stringify({ type: "approve_execution", payload: { project_id: "proj-123", approve: false, notes: undefined } })
      );
    });
  });

  it("handles agent_event message", async () => {
    const { result } = renderHook(() => useWebSocket("ws://localhost:3001"));
    act(() => {
      const msg = {
        type: "agent_event",
        payload: {
          agent: "ceo",
          phase: "intake",
          status: "done",
          message: "Project accepted",
          timestamp: Date.now(),
        },
      };
      mockWsInstance.onmessage?.({ data: JSON.stringify(msg) } as MessageEvent);
    });
    await waitFor(() => {
      expect(result.current.events).toHaveLength(1);
      expect(result.current.events[0].agent).toBe("ceo");
    });
  });

  it("adds project to list on processing_start", async () => {
    const { result } = renderHook(() => useWebSocket("ws://localhost:3001"));
    const project = {
      project_id: "test-1",
      project_title: "Test",
      project_description: "Desc",
      current_phase: "intake",
      status: "pending",
    };
    act(() => {
      mockWsInstance.onmessage?.({
        data: JSON.stringify({ type: "processing_start", payload: { project } }),
      } as MessageEvent);
    });
    await waitFor(() => {
      expect(result.current.projects.some((p) => p.project_id === "test-1")).toBe(true);
    });
  });

  it("clears events on processing_start for a new run", async () => {
    const { result } = renderHook(() => useWebSocket("ws://localhost:3001"));
    // First add an event
    act(() => {
      mockWsInstance.onmessage?.({
        data: JSON.stringify({
          type: "agent_event",
          payload: { agent: "ceo", phase: "intake", status: "done", message: "old", timestamp: 1 },
        }),
      } as MessageEvent);
    });
    await waitFor(() => expect(result.current.events).toHaveLength(1));
    // Now processing_start should clear events
    act(() => {
      mockWsInstance.onmessage?.({
        data: JSON.stringify({ type: "processing_start", payload: { project: { project_id: "new-1" } } }),
      } as MessageEvent);
    });
    await waitFor(() => expect(result.current.events).toHaveLength(0));
  });

  it("adds project on phase_start if not in list", async () => {
    const { result } = renderHook(() => useWebSocket("ws://localhost:3001"));
    const project = { project_id: "ph-1", project_title: "Phase test", current_phase: "planning", status: "in_progress" };
    act(() => {
      mockWsInstance.onmessage?.({
        data: JSON.stringify({ type: "phase_start", payload: { project, phase: "planning" } }),
      } as MessageEvent);
    });
    await waitFor(() => {
      expect(result.current.projects.some((p) => p.project_id === "ph-1")).toBe(true);
    });
  });

  it("clears projects", () => {
    const { result } = renderHook(() => useWebSocket("ws://localhost:3001"));
    act(() => {
      result.current.clearProjects();
    });
    expect(result.current.projects).toHaveLength(0);
  });
});