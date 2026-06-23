import "dotenv/config";
import { server } from "./server.js";

const PORT = process.env.PORT ?? 3001;
server.listen(PORT, () => {
  console.log(`\n🚀 A-Company backend running on http://localhost:${PORT}`);
  console.log(`📡 WebSocket ready on ws://localhost:${PORT}\n`);
  console.log(`🔧 LLM Provider: ${process.env.LLM_PROVIDER ?? "openai"}`);
  console.log(`📦 Model: ${process.env.OPENAI_MODEL ?? process.env.ANTHROPIC_MODEL ?? "gpt-4o-mini"}\n`);
});
