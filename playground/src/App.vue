<script setup lang="ts">
import { computed, ref } from "vue";
import {
  ChatWindow,
  ChatHeader,
  ChatMessages,
  ChatInput,
  ChatError,
  useChat,
  useTheme,
  type ChatTransport,
  type ThemeSetting,
} from "@vue-agent-sdk/ui";

// Theme switcher (applies a `data-theme` to <html>, persisted to localStorage).
const { theme, setTheme } = useTheme({ default: "dark" });
const THEMES: ThemeSetting[] = ["system", "light", "dark", "emerald", "rose"];

// Custom avatars (passed into <ChatMessages :avatars>).
const avatars = {
  user: "https://api.dicebear.com/9.x/thumbs/svg?seed=you",
  assistant: "https://api.dicebear.com/9.x/bottts/svg?seed=agent",
};

// Toggle virtualization for long chats.
const virtualized = ref(false);

// Toggle between streaming and non-streaming requests at runtime.
const streaming = ref(true);

// Talks to the Express + OpenAI backend (see playground/server/index.mjs).
// The AbortSignal is forwarded to fetch so stop() cancels the request.
const openaiTransport: ChatTransport = async function* (messages, { signal }) {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({
      stream: streaming.value,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    }),
  });

  if (!res.ok) {
    const detail = await res.json().catch(() => null);
    throw new Error(detail?.error ?? `Request failed with status ${res.status}`);
  }

  if (!streaming.value) {
    const data = (await res.json()) as { content?: string };
    yield data.content ?? "";
    return;
  }

  if (!res.body) throw new Error("No response body to stream.");
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    yield decoder.decode(value, { stream: true });
  }
};

const { messages, input, isLoading, status, error, handleSubmit, regenerate, stop, clear } =
  useChat({
    initialMessages: [
      {
        id: "welcome",
        role: "assistant",
        content: "Hey! I'm a demo agent built with the Vue Agent SDK. Ask me anything.",
        status: "sent",
      },
    ],
    transport: openaiTransport,
  });

// Offer "Regenerate" once the last message is a finished assistant reply.
const canRegenerate = computed(() => {
  const last = messages.value.at(-1);
  return !isLoading.value && last?.role === "assistant";
});

function dismissError() {
  error.value = null;
}

// Inject a crafted message that exercises every rich-content feature, since
// the live model won't reliably emit tool calls / citations / attachments.
const RICH_CONTENT = `Here's a quick tour of **rich rendering**.

## Markdown + tables

| Framework | Language | Stars |
| --------- | -------- | ----- |
| Vue       | JS/TS    | ⭐⭐⭐⭐  |
| Svelte    | JS/TS    | ⭐⭐⭐   |

## Syntax-highlighted code

\`\`\`ts
function greet(name: string): string {
  // inline code like \`const x = 1\` also works
  return \`Hello, \${name}!\`;
}
\`\`\`

## Math

Inline: $e^{i\\pi} + 1 = 0$, and a block:

$$\\int_{-\\infty}^{\\infty} e^{-x^2}\\,dx = \\sqrt{\\pi}$$

## Image

![A tiny placeholder](https://placehold.co/240x80/6d5efc/ffffff?text=Vue+Agent+SDK)
`;

// Bulk-add messages to demonstrate grouping + virtualization on long chats.
function bulkAdd() {
  const now = Date.now();
  const batch = Array.from({ length: 30 }, (_, i) => {
    const role = i % 3 === 0 ? "user" : "assistant";
    return {
      id: `bulk-${now}-${i}`,
      role: role as "user" | "assistant",
      content:
        role === "user"
          ? `Question #${i + 1}: what's interesting about item ${i + 1}?`
          : `Reply #${i + 1}. Consecutive messages from the same author are **grouped** under one avatar. This list can be virtualized for performance.`,
      status: "sent" as const,
      createdAt: now + i,
    };
  });
  messages.value.push(...batch);
}

function insertRichDemo() {
  messages.value.push({
    id: `demo-${Date.now()}`,
    role: "assistant",
    content: RICH_CONTENT,
    status: "sent",
    reasoning:
      "The user asked for a feature tour. I'll show a table, a fenced code block, inline + block math, and an image, then attach the supporting tool call and sources.",
    toolCalls: [
      {
        id: "call_1",
        name: "search_docs",
        args: { query: "vue agent sdk features", limit: 3 },
        result: { hits: 3, top: "rich-content rendering" },
        status: "success",
      },
    ],
    attachments: [
      { type: "image", url: "https://placehold.co/160x100/10b981/ffffff?text=chart.png", name: "chart.png" },
      { type: "file", url: "#", name: "report.pdf", size: 248_000 },
    ],
    citations: [
      { title: "Vue.js Documentation", url: "https://vuejs.org" },
      { title: "markdown-it", url: "https://github.com/markdown-it/markdown-it" },
      { title: "KaTeX", url: "https://katex.org" },
    ],
  });
}
</script>

<template>
  <main class="flex min-h-full items-center justify-center p-4 sm:p-8">
    <div class="flex w-full max-w-2xl flex-col gap-4">
      <div class="text-center">
        <h1 class="text-2xl font-bold tracking-tight">Vue Agent SDK</h1>
        <p class="mt-1 text-sm text-[var(--agent-muted)]">
          Composable building blocks · slot them into &lt;ChatWindow&gt;
        </p>
      </div>

      <div class="h-[70vh] min-h-[480px]">
        <ChatWindow>
          <ChatHeader title="Demo Agent" :status="status">
            <template #actions>
              <select
                :value="theme"
                class="rounded-lg border border-[var(--agent-border)] bg-[var(--agent-surface)] px-1.5 py-1 text-xs text-[var(--agent-fg)]"
                aria-label="Theme"
                @change="setTheme(($event.target as HTMLSelectElement).value)"
              >
                <option v-for="t in THEMES" :key="t" :value="t">{{ t }}</option>
              </select>
              <label
                class="flex cursor-pointer select-none items-center gap-1.5 text-xs text-[var(--agent-muted)]"
              >
                <input v-model="virtualized" type="checkbox" class="accent-[var(--agent-primary)]" />
                Virtualize
              </label>
              <label
                class="flex cursor-pointer select-none items-center gap-1.5 text-xs text-[var(--agent-muted)]"
              >
                <input v-model="streaming" type="checkbox" class="accent-[var(--agent-primary)]" />
                Stream
              </label>
              <button
                type="button"
                class="rounded-lg px-2.5 py-1 text-xs text-[var(--agent-muted)] transition-colors hover:text-[var(--agent-fg)]"
                @click="bulkAdd"
              >
                Bulk +30
              </button>
              <button
                type="button"
                class="rounded-lg px-2.5 py-1 text-xs text-[var(--agent-muted)] transition-colors hover:text-[var(--agent-fg)]"
                @click="insertRichDemo"
              >
                Rich demo
              </button>
              <button
                type="button"
                class="rounded-lg px-2.5 py-1 text-xs text-[var(--agent-muted)] transition-colors hover:text-[var(--agent-fg)]"
                @click="clear"
              >
                Clear
              </button>
            </template>
          </ChatHeader>

          <ChatMessages :messages="messages" :avatars="avatars" :virtualized="virtualized" />

          <ChatError v-if="error" :error="error" @dismiss="dismissError" />

          <ChatInput
            v-model="input"
            :loading="isLoading"
            :can-regenerate="canRegenerate"
            placeholder="Ask the agent something..."
            @submit="handleSubmit"
            @stop="stop"
            @regenerate="regenerate"
          />
        </ChatWindow>
      </div>
    </div>
  </main>
</template>
