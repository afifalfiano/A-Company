import "dotenv/config";
import { server } from "./server.js";

const PORT = process.env.PORT ?? 3001;
server.listen(PORT, () => {
  console.log(`\n🚀 Happy-Agents backend running on http://localhost:${PORT}`);
  console.log(`📡 WebSocket ready on ws://localhost:${PORT}\n`);
  console.log(`🧠 Model: ${process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6"}\n`);
});

// Graceful shutdown — let in-flight requests finish before exit
function shutdown(signal: string) {
  console.log(`\n[Shutdown] ${signal} received — closing server`);
  server.close(() => {
    console.log("[Shutdown] HTTP server closed");
    process.exit(0);
  });
  // Force-kill if server hasn't closed in 10s
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT",  () => shutdown("SIGINT"));
