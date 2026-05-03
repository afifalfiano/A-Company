import { useEffect, useRef, useState, useCallback } from "react";
import {
  AgentEvent,
  AgentName,
  ProjectItem,
  WsMessage,
} from "../models";

const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_BASE_DELAY_MS = 1000;

export function useWebSocket(url: string) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isConnectingRef = useRef(false);
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [processing, setProcessing] = useState(false);
  const [activeAgent, setActiveAgent] = useState<AgentName | null>(null);
  const [pendingGate, setPendingGate] = useState<{ projectId: string; type: "planning" | "execution" } | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    if (isConnectingRef.current) return;
    isConnectingRef.current = true;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      isConnectingRef.current = false;
      setConnected(true);
      reconnectAttemptsRef.current = 0;
    };

    ws.onclose = () => {
      isConnectingRef.current = false;
      setConnected(false);
      setProcessing(false);
      wsRef.current = null;

      // Reconnect with exponential backoff
      if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
        const delay = RECONNECT_BASE_DELAY_MS * Math.pow(2, reconnectAttemptsRef.current);
        reconnectAttemptsRef.current++;
        reconnectTimerRef.current = setTimeout(() => {
          connect();
        }, delay);
      }
    };

    ws.onerror = (e) => {
      console.warn("[WS Error] Connection error", e);
    };

    ws.onmessage = (e) => {
      let msg: WsMessage;
      try {
        msg = JSON.parse(e.data);
      } catch {
        console.error("[WS] Failed to parse message:", e.data);
        return;
      }

      switch (msg.type) {
        case "agent_event":
          setEvents((prev) => [...prev, msg.payload]);
          setActiveAgent(msg.payload.agent);
          if (msg.payload.status === "done") {
            setTimeout(() => setActiveAgent(null), 600);
          }
          break;

        case "processing_start":
          setEvents((prev) => [...prev]);
          setProcessing(true);
          setActiveAgent("ceo");
          break;

        case "phase_start":
          setProcessing(true);
          setActiveAgent("ceo");
          break;

        case "processing_done":
          setProcessing(false);
          setActiveAgent(null);
          setProjects((prev) => {
            const idx = prev.findIndex((p) => p.project_id === msg.payload.project.project_id);
            if (idx >= 0) {
              const next = [...prev];
              next[idx] = { ...prev[idx], ...msg.payload.project };
              return next;
            }
            return [...prev, msg.payload.project];
          });
          setPendingGate(null);
          break;

        case "project_update":
          setProjects((prev) => {
            const idx = prev.findIndex((p) => p.project_id === msg.payload.project.project_id);
            if (idx >= 0) {
              const next = [...prev];
              // Merge instead of replace
              next[idx] = { ...prev[idx], ...msg.payload.project };
              return next;
            }
            return prev;
          });
          break;

        case "gate_pending":
          setPendingGate({ projectId: msg.payload.project.project_id, type: msg.payload.gate });
          setProcessing(true);
          break;

        case "gate_approved":
          setPendingGate(null);
          setProcessing(true);
          break;

        case "gate_rejected":
          setPendingGate(null);
          setProcessing(false);
          break;

        case "error":
          setProcessing(false);
          setActiveAgent(null);
          console.error("[WS Error]", msg.payload.message);
          break;
      }
    };
  }, [url]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      wsRef.current?.close();
    };
  }, [connect]);

  const sendProject = useCallback((title: string, description: string) => {
    wsRef.current?.send(JSON.stringify({
      type: "process_project",
      payload: { title, description },
    }));
  }, []);

  const startPlanning = useCallback((projectId: string) => {
    wsRef.current?.send(JSON.stringify({
      type: "start_planning",
      payload: { project_id: projectId },
    }));
  }, []);

  const approvePlanning = useCallback((projectId: string, approve: boolean, notes?: string) => {
    wsRef.current?.send(JSON.stringify({
      type: "approve_planning",
      payload: { project_id: projectId, approve, notes },
    }));
  }, []);

  const approveExecution = useCallback((projectId: string, approve: boolean, notes?: string) => {
    wsRef.current?.send(JSON.stringify({
      type: "approve_execution",
      payload: { project_id: projectId, approve, notes },
    }));
  }, []);

  const clearProjects = useCallback(() => setProjects([]), []);

  return {
    connected,
    events,
    projects,
    processing,
    activeAgent,
    pendingGate,
    sendProject,
    startPlanning,
    approvePlanning,
    approveExecution,
    clearProjects,
  };
}
