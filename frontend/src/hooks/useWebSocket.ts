import { useEffect, useRef, useState, useCallback } from "react";
import {
  AgentEvent,
  AgentName,
  ProjectItem,
  WsMessage,
  CodeGenMode,
} from "../models";

const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_BASE_DELAY_MS = 1000;

export function useWebSocket(url: string) {
  // ws://host → http://host, wss://host → https://host
  const httpBase = url.replace(/^ws/, "http");

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
  const [codeGenMode, setCodeGenMode] = useState<CodeGenMode | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingProjectId, setGeneratingProjectId] = useState<string | null>(null);
  const [zipUrl, setZipUrl] = useState<string | null>(null);

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
      // Restore projects from server on every (re)connect — authoritative source
      fetch(httpBase + "/projects")
        .then((r) => r.json())
        .then((data: { projects?: ProjectItem[] }) => {
          if (data.projects?.length) {
            setProjects((prev) => {
              const byId = new Map(prev.map((p) => [p.project_id, p]));
              for (const p of data.projects!) byId.set(p.project_id, p);
              return [...byId.values()];
            });
          }
        })
        .catch(() => {/* server may not be ready yet, ignore */});
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
          setEvents([]);
          setProcessing(true);
          setActiveAgent("ceo");
          // Add project immediately so it shows in the board during processing
          if (msg.payload?.project) {
            setProjects((prev) => {
              const exists = prev.some((p) => p.project_id === msg.payload.project.project_id);
              return exists ? prev : [...prev, msg.payload.project];
            });
          }
          break;

        case "phase_start":
          setProcessing(true);
          setActiveAgent("ceo");
          if (msg.payload?.project) {
            setProjects((prev) => {
              const idx = prev.findIndex((p) => p.project_id === msg.payload.project.project_id);
              if (idx >= 0) {
                const next = [...prev];
                next[idx] = { ...prev[idx], ...msg.payload.project };
                return next;
              }
              return [...prev, msg.payload.project];
            });
          }
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

        case "code_gen_start":
          setIsGenerating(true);
          setCodeGenMode(null);
          setZipUrl(null);
          setGeneratingProjectId(msg.payload.project_id);
          break;

        case "code_gen_done":
          setIsGenerating(false);
          setCodeGenMode(msg.payload.metadata.mode);
          setGeneratingProjectId(null);
          break;

        case "code_gen_download_ready":
          setZipUrl(httpBase + msg.payload.zip_url);
          break;

        case "code_gen_error":
          setIsGenerating(false);
          setCodeGenMode(null);
          setZipUrl(null);
          setGeneratingProjectId(null);
          console.error("[CodeGen Error]", msg.payload.message);
          break;

        case "design_gen_start":
          setIsGenerating(true);
          setCodeGenMode(null);
          setZipUrl(null);
          setGeneratingProjectId(msg.payload.project_id);
          break;

        case "design_gen_done":
          setIsGenerating(false);
          setGeneratingProjectId(null);
          break;

        case "design_gen_download_ready":
          setZipUrl(msg.payload.output_path);
          break;

        case "design_gen_error":
          setIsGenerating(false);
          setGeneratingProjectId(null);
          console.error("[DesignGen Error]", msg.payload.message);
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

  const startExecution = useCallback((projectId: string) => {
    wsRef.current?.send(JSON.stringify({
      type: "start_execution",
      payload: { project_id: projectId },
    }));
  }, []);

  const startCodeGeneration = useCallback((projectId: string, mode: CodeGenMode) => {
    wsRef.current?.send(JSON.stringify({
      type: "generate_code",
      payload: { project_id: projectId, mode },
    }));
  }, []);

  const generateDesign = useCallback((projectId: string, mode: CodeGenMode) => {
    wsRef.current?.send(JSON.stringify({
      type: "generate_design",
      payload: { project_id: projectId, mode },
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
    codeGenMode,
    isGenerating,
    generatingProjectId,
    zipUrl,
    sendProject,
    startPlanning,
    startExecution,
    startCodeGeneration,
    generateDesign,
    approvePlanning,
    approveExecution,
    clearProjects,
  };
}
