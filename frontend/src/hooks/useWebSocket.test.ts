import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useWebSocket } from "../hooks/useWebSocket";

// Module-level mock instance shared across tests
const sendMock = vi.fn();
const closeMock = vi.fn();

const createMockWs = () => ({
  readyState: 1,
  send: sendMock,
  close: closeMock,
  onopen: null as ((e: Event) => void) | null,
  onclose: null as ((e: Event) => void) | null,
  onmessage: null as ((e: MessageEvent) => void) | null,
  onerror: null as ((e: Event) => void) | null,
});

let mockWsInstance: ReturnType<typeof createMockWs>;

vi.stubGlobal(
  "WebSocket",
  vi.fn(() => {
    mockWsInstance = createMockWs();
    return mockWsInstance;
  })
);

describe("useWebSocket", () => {
  beforeEach(() => {
    sendMock.mockReset();
    closeMock.mockReset();
    mockWsInstance = createMockWs();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("connects to WebSocket on mount", () => {
    renderHook(() => useWebSocket("ws://localhost:3001"));
    expect(WebSocket).toHaveBeenCalledWith("ws://localhost:3001");
  });

  it("sets connected true when socket opens", () => {
    const { result } = renderHook(() => useWebSocket("ws://localhost:3001"));
    act(() => {
      mockWsInstance.onopen?.({} as Event);
    });
    expect(result.current.connected).toBe(true);
  });

  it("sends process_project message", () => {
    const { result } = renderHook(() => useWebSocket("ws://localhost:3001"));
    act(() => {
      result.current.sendProject("Test Project", "Description");
    });
    expect(sendMock).toHaveBeenCalledWith(
      JSON.stringify({ type: "process_project", payload: { title: "Test Project", description: "Description" } })
    );
  });

  it("sends start_planning message", () => {
    const { result } = renderHook(() => useWebSocket("ws://localhost:3001"));
    act(() => {
      result.current.startPlanning("proj-123");
    });
    expect(sendMock).toHaveBeenCalledWith(
      JSON.stringify({ type: "start_planning", payload: { project_id: "proj-123" } })
    );
  });

  it("sends approve_planning with approve=true", () => {
    const { result } = renderHook(() => useWebSocket("ws://localhost:3001"));
    act(() => {
      result.current.approvePlanning("proj-123", true, "Looks good");
    });
    expect(sendMock).toHaveBeenCalledWith(
      JSON.stringify({ type: "approve_planning", payload: { project_id: "proj-123", approve: true, notes: "Looks good" } })
    );
  });

  it("sends approve_execution with approve=false", () => {
    const { result } = renderHook(() => useWebSocket("ws://localhost:3001"));
    act(() => {
      result.current.approveExecution("proj-123", false);
    });
    expect(sendMock).toHaveBeenCalledWith(
      JSON.stringify({ type: "approve_execution", payload: { project_id: "proj-123", approve: false, notes: undefined } })
    );
  });

  it("handles agent_event message", () => {
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
    expect(result.current.events).toHaveLength(1);
    expect(result.current.events[0].agent).toBe("ceo");
  });

  it("clears projects", () => {
    const { result } = renderHook(() => useWebSocket("ws://localhost:3001"));
    act(() => {
      result.current.clearProjects();
    });
    expect(result.current.projects).toHaveLength(0);
  });
});
