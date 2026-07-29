// Local stand-in for Groq during E2E runs -- deterministic, zero real spend.
// Plain Node http, no new dependency. server/config/groq.ts's GROQ_BASE_URL
// override points the app at this instead of api.groq.com when it's set.
import { createServer, type IncomingMessage, type Server } from "node:http";

const CANNED_TRANSCRIPTION = {
  segments: [
    { start: 0, end: 3.4, text: "This is a short test recording for automated verification." },
  ],
};

// Matches server/config/analysis-schema.ts's AnalysisSchema exactly -- one
// real action item so the E2E flow has something to move on the /tasks board.
const CANNED_ANALYSIS = {
  overview:
    "A short test meeting used to verify the end-to-end pipeline. The team reviewed the budget proposal and agreed on next steps.",
  attendees: [{ speakerLabel: "Speaker 1", name: null, confidence: "inferred" }],
  topics: [{ title: "Budget review", points: ["Reviewed the Q3 numbers"], atSec: 0 }],
  decisions: [{ text: "Proceed with the current plan", atSec: 0 }],
  openQuestions: [],
  actionItems: [
    {
      title: "Follow up on the budget proposal",
      detail: "Confirm the final numbers with finance",
      owner: "Speaker 1",
      dueDate: null,
      priority: "medium",
      atSec: 0,
    },
  ],
};

// Matches server/config/email-schema.ts's EmailSchema exactly.
const CANNED_EMAIL = {
  subject: "Follow-up: Test Recording",
  bodyMarkdown: "Hi team,\n\nThanks for joining. Quick recap of what we covered and next steps attached.\n\nBest",
};

function chatCompletion(content: unknown) {
  return {
    choices: [{ message: { content: JSON.stringify(content) } }],
    usage: { total_tokens: 100 },
  };
}

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf-8");
}

export function startMockGroqServer(port: number): Promise<Server> {
  const server = createServer(async (req, res) => {
    res.setHeader("Content-Type", "application/json");

    if (req.url === "/openai/v1/audio/transcriptions") {
      // Multipart form -- request body doesn't need parsing, the fixture
      // audio's content is irrelevant to this canned response.
      await readBody(req);
      res.end(JSON.stringify(CANNED_TRANSCRIPTION));
      return;
    }

    if (req.url === "/openai/v1/chat/completions") {
      const raw = await readBody(req);
      const body = JSON.parse(raw) as { messages: { role: string; content: string }[] };
      const systemPrompt = body.messages[0]?.content ?? "";

      if (systemPrompt.includes("expert meeting analyst")) {
        res.end(JSON.stringify(chatCompletion(CANNED_ANALYSIS)));
        return;
      }
      if (systemPrompt.includes("follow-up emails")) {
        res.end(JSON.stringify(chatCompletion(CANNED_EMAIL)));
        return;
      }

      res.statusCode = 500;
      res.end(JSON.stringify({ error: "mock-groq-server: unrecognized system prompt" }));
      return;
    }

    res.statusCode = 404;
    res.end(JSON.stringify({ error: "mock-groq-server: unknown route" }));
  });

  return new Promise((resolve) => {
    server.listen(port, () => resolve(server));
  });
}
