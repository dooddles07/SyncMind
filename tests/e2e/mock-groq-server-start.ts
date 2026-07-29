// Entry point for the Playwright webServer config to spawn -- see
// mock-groq-server.ts for the actual handler logic.
import { startMockGroqServer } from "./mock-groq-server";

const port = Number(process.argv[2] ?? 4010);
startMockGroqServer(port).then(() => {
  console.log(`mock-groq-server listening on ${port}`);
});
