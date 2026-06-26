import "dotenv/config";
import express from "express";
import cors from "cors";
import OpenAI from "openai";

const PORT = Number(process.env.PORT ?? 8787);
const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

const app = express();
app.use(cors());
app.use(express.json());

const apiKey = process.env.OPENAI_API_KEY;
const client = apiKey ? new OpenAI({ apiKey }) : null;

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, model: MODEL, hasKey: Boolean(apiKey) });
});

// Schema used for the structured-output demo. The model is forced to return
// JSON matching this shape; the client parses it progressively into a card.
const STRUCTURED_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string", description: "Short title for the answer." },
    summary: { type: "string", description: "One or two sentence overview." },
    steps: {
      type: "array",
      description: "Ordered list of actionable steps.",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          detail: { type: "string" },
        },
        required: ["name", "detail"],
      },
    },
    tags: { type: "array", items: { type: "string" } },
  },
  required: ["title", "summary", "steps", "tags"],
};

/**
 * POST /api/chat
 * Body: { messages: { role, content }[], stream?: boolean, structured?: boolean }
 *
 * - stream === true (default): replies with plain UTF-8 text chunks.
 * - stream === false: replies with JSON { content }.
 * - structured === true: forces JSON output matching STRUCTURED_SCHEMA
 *   (the streamed/returned text is JSON the client parses progressively).
 */
app.post("/api/chat", async (req, res) => {
  if (!client) {
    return res.status(500).json({
      error: "OPENAI_API_KEY is not set. Add it to playground/.env and restart the API.",
    });
  }

  const incoming = Array.isArray(req.body?.messages) ? req.body.messages : [];
  const wantStream = req.body?.stream !== false;
  const wantStructured = req.body?.structured === true;
  const messages = incoming
    .filter((m) => m && typeof m.content === "string")
    .map((m) => ({
      role: ["system", "user", "assistant"].includes(m.role) ? m.role : "user",
      content: m.content,
    }));

  if (messages.length === 0) {
    return res.status(400).json({ error: "No messages provided." });
  }

  // Prepend a system prompt if the client didn't send one.
  if (messages[0].role !== "system") {
    messages.unshift({
      role: "system",
      content: wantStructured
        ? "You are a helpful assistant built with the Vue Agent SDK. Answer the user's request as a structured plan that matches the provided JSON schema. Always include a few concrete steps and relevant tags."
        : "You are a helpful, concise AI assistant built with the Vue Agent SDK.",
    });
  }

  // Forces JSON output matching STRUCTURED_SCHEMA when structured mode is on.
  const responseFormat = wantStructured
    ? {
        response_format: {
          type: "json_schema",
          json_schema: { name: "structured_answer", schema: STRUCTURED_SCHEMA, strict: true },
        },
      }
    : {};

  // Abort the OpenAI request only if the *client* disconnects mid-response
  // (e.g. user hit Stop). Listening on `res` (not `req`) avoids aborting when
  // the request body simply finishes being received.
  const ac = new AbortController();
  res.on("close", () => {
    if (!res.writableEnded) ac.abort();
  });

  try {
    // --- Non-streaming path ---
    if (!wantStream) {
      const completion = await client.chat.completions.create(
        { model: MODEL, messages, stream: false, ...responseFormat },
        { signal: ac.signal },
      );
      return res.json({ content: completion.choices?.[0]?.message?.content ?? "" });
    }

    // --- Streaming path ---
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("X-Accel-Buffering", "no");

    const stream = await client.chat.completions.create(
      { model: MODEL, messages, stream: true, ...responseFormat },
      { signal: ac.signal },
    );

    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta?.content;
      if (delta) {
        res.write(delta);
        // Flush eagerly so the UI streams token-by-token.
        res.flush?.();
      }
    }
    res.end();
  } catch (err) {
    if (ac.signal.aborted) {
      // Client cancelled — just end the response quietly.
      return res.end();
    }
    console.error("[/api/chat] OpenAI error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    if (res.headersSent) {
      res.write(`\n\n[error] ${message}`);
      res.end();
    } else {
      res.status(500).json({ error: message });
    }
  }
});

app.listen(PORT, () => {
  console.log(`> API listening on http://localhost:${PORT}`);
  if (!apiKey) {
    console.warn("> WARNING: OPENAI_API_KEY is not set — /api/chat will return 500.");
  }
});
