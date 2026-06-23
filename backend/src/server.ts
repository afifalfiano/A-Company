import express from "express";
import cors from "cors";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import rateLimit from "express-rate-limit";
import { requireApiKey, isValidWsKey } from "./middleware/auth.js";
import { WsRateLimiter } from "./middleware/wsRateLimit.js";
import { makeRestRouter } from "./handlers/rest-handlers.js";
import {
  send,
  broadcast,
  handleProcessProject,
  handleStartPlanning,
  handleApprovePlanning,
  handleApproveExecution,
  handleStartExecution,
  handleGenerateCode,
  handleGenerateDesign,
} from "./handlers/ws-handlers.js";
import type { CodeGenMode } from "./state.js";
import type { IncomingMessage } from "http";

// ─── Express app ──────────────────────────────────────────────────────────────

const app = express();

const allowedOrigin = process.env.CORS_ORIGIN ?? "*";
app.use(cors({ origin: allowedOrigin }));
app.use(express.json({ limit: "50kb" }));

// ─── REST rate limiter ────────────────────────────────────────────────────────

const restLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
});
app.use(restLimiter);

// ─── Auth middleware ──────────────────────────────────────────────────────────

app.use(requireApiKey);

// ─── Routes ───────────────────────────────────────────────────────────────────

app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.use("/", makeRestRouter());

// ─── HTTP server + WebSocket server ──────────────────────────────────────────

const server = createServer(app);

function verifyClient({ req }: { req: IncomingMessage }): boolean {
  const query = new URL(req.url ?? "/", "ws://localhost").searchParams;
  return isValidWsKey(query.get("key") ?? undefined);
}

const wss = new WebSocketServer({ server, verifyClient });

// ─── WS rate limiter ──────────────────────────────────────────────────────────

const wsLimiter = new WsRateLimiter({
  max: parseInt(process.env.WS_RATE_MAX ?? "30", 10),
  windowMs: parseInt(process.env.WS_RATE_WINDOW_MS ?? "60000", 10),
});

// ─── WS message type ──────────────────────────────────────────────────────────

interface WsMessage {
  type: string;
  payload: {
    title?: string;
    description?: string;
    project_id?: string;
    approve?: boolean;
    notes?: string;
    mode?: CodeGenMode;
  };
}

// ─── WebSocket connection handler ─────────────────────────────────────────────

wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
  console.log("[WS] Client connected");
  send(ws, { type: "connected", payload: { message: "A-Company Software House ready!" } });

  // Extract client IP for rate limiting
  const ip =
    (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0].trim() ??
    req.socket.remoteAddress ??
    "unknown";

  ws.on("message", async (raw) => {
    // 1. Rate limit check
    if (!wsLimiter.check(ip)) {
      send(ws, { type: "error", payload: { message: "Rate limit exceeded, please slow down" } });
      return;
    }

    // 2. Parse JSON
    let msg: WsMessage;
    try {
      msg = JSON.parse(raw.toString()) as WsMessage;
    } catch {
      send(ws, { type: "error", payload: { message: "Invalid JSON" } });
      return;
    }

    // 3. Dispatch to handler + catch unexpected errors
    try {
      switch (msg.type) {
        case "process_project":
          await handleProcessProject(ws, wss, msg.payload);
          break;
        case "start_planning":
          await handleStartPlanning(ws, wss, msg.payload);
          break;
        case "approve_planning":
          await handleApprovePlanning(ws, wss, msg.payload);
          break;
        case "approve_execution":
          await handleApproveExecution(ws, wss, msg.payload);
          break;
        case "start_execution":
          await handleStartExecution(ws, wss, msg.payload);
          break;
        case "generate_code":
          await handleGenerateCode(ws, wss, msg.payload as { project_id?: string; mode?: CodeGenMode });
          break;
        case "generate_design":
          await handleGenerateDesign(ws, wss, msg.payload as { project_id?: string; mode?: CodeGenMode });
          break;
        default:
          send(ws, { type: "error", payload: { message: `Unknown message type: ${msg.type}` } });
      }
    } catch (err) {
      console.error("[WS Handler Error]", err);
      send(ws, { type: "error", payload: { message: "Internal server error" } });
    }
  });

  ws.on("close", () => console.log("[WS] Client disconnected"));
  ws.on("error", (err) => console.error("[WS Error]", err));
});

export { server, wss, app };
