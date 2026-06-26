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

/**
 * POST /api/chat
 * Body: { messages: { role, content }[], stream?: boolean }
 *
 * - stream === true (default): replies with plain UTF-8 text chunks.
 * - stream === false: replies with JSON { content }.
 */
app.post("/api/chat", async (req, res) => {
  if (!client) {
    return res.status(500).json({
      error: "OPENAI_API_KEY is not set. Add it to playground/.env and restart the API.",
    });
  }

  const incoming = Array.isArray(req.body?.messages) ? req.body.messages : [];
  const wantStream = req.body?.stream !== false;
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
      content: "You are a helpful, concise AI assistant built with the Vue Agent SDK.",
    });
  }

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
        { model: MODEL, messages, stream: false },
        { signal: ac.signal },
      );
      return res.json({ content: completion.choices?.[0]?.message?.content ?? "" });
    }

    // --- Streaming path ---
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("X-Accel-Buffering", "no");

    const stream = await client.chat.completions.create(
      { model: MODEL, messages, stream: true },
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
