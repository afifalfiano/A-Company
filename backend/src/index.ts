import "dotenv/config";
import { server } from "./server.js";

const PORT = process.env.PORT ?? 3001;
server.listen(PORT, () => {
  console.log(`\n🚀 A-Company backend running on http://localhost:${PORT}`);
  console.log(`📡 WebSocket ready on ws://localhost:${PORT}\n`);
  console.log(`🧠 Model: ${process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6"}\n`);
});
