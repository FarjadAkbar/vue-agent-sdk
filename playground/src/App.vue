<script setup lang="ts">
import { computed, ref, watch } from "vue";
import {
  ChatLayout,
  ChatSidebar,
  ChatSidebarToggle,
  ChatConversationList,
  ChatWindow,
  ChatHeader,
  ChatMessages,
  ChatInput,
  ChatError,
  useChat,
  useTheme,
  ChatStructured,
  ChatAttachment as Attachment,
  type ChatTransport,
  type ThemeSetting,
  type StructuredField,
  type SendOptions,
  type Conversation,
  type Message,
} from "@vue-agent-sdk/ui";

// Declarative layout for the structured-output schema (see server STRUCTURED_SCHEMA).
// Pass this array to <ChatStructured> and it handles rendering the streamed JSON.
const answerSchema: StructuredField[] = [
  { key: "title", type: "title" },
  { key: "summary", type: "summary" },
  { key: "steps", type: "steps", label: "Steps", nameKey: "name", detailKey: "detail" },
  { key: "tags", type: "tags", label: "Tags" },
];

// Theme switcher (applies a `data-theme` to <html>, persisted to localStorage).
const { theme, setTheme } = useTheme({ default: "dark" });
const THEMES: ThemeSetting[] = ["system", "light", "dark", "emerald", "rose"];

// --- Conversations (sidebar) ------------------------------------------------
interface Convo {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
}

const uid = () => Math.random().toString(36).slice(2);

function welcome(): Message {
  return {
    id: uid(),
    role: "assistant",
    content: "Hey! I'm a demo agent built with the Vue Agent SDK. Ask me anything.",
    status: "sent",
  };
}

const conversations = ref<Convo[]>([
  { id: uid(), title: "New chat", messages: [welcome()], updatedAt: Date.now() },
  {
    id: uid(),
    title: "Deploying to production",
    updatedAt: Date.now() - 60_000,
    messages: [
      { id: uid(), role: "user", content: "How do I deploy a Vue app?", status: "sent" },
      {
        id: uid(),
        role: "assistant",
        content: "Build with `vite build`, then host the `dist/` folder on any static host.",
        status: "sent",
      },
    ],
  },
  {
    id: uid(),
    title: "Coffee brewing tips",
    updatedAt: Date.now() - 120_000,
    messages: [
      { id: uid(), role: "user", content: "Best ratio for pour-over?", status: "sent" },
      { id: uid(), role: "assistant", content: "Start at 1:16 coffee-to-water by weight.", status: "sent" },
    ],
  },
]);

const activeId = ref(conversations.value[0].id);
const active = computed(() => conversations.value.find((c) => c.id === activeId.value));

// Conversations for the sidebar list, most-recent first.
const conversationItems = computed<Conversation[]>(() =>
  [...conversations.value]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .map((c) => ({ id: c.id, title: c.title, updatedAt: c.updatedAt })),
);

// Custom avatars (passed into <ChatMessages :avatars>).
const avatars = {
  user: "https://api.dicebear.com/9.x/thumbs/svg?seed=you",
  assistant: "https://api.dicebear.com/9.x/bottts/svg?seed=agent",
};

// Toggle virtualization for long chats.
const virtualized = ref(false);

// Toggle between streaming and non-streaming requests at runtime.
const streaming = ref(true);

// Toggle structured (JSON) output. When on, the transport asks the server for
// schema-constrained JSON and useChat parses it progressively into message.data.
const structured = ref(false);

// Talks to the Express + OpenAI backend (see playground/server/index.mjs).
// The AbortSignal is forwarded to fetch so stop() cancels the request.
const openaiTransport: ChatTransport = async function* (messages, { signal }) {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({
      stream: streaming.value,
      structured: structured.value,
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

const { messages, input, isLoading, status, error, handleSubmit, regenerate, stop } = useChat({
  initialMessages: conversations.value[0].messages,
  transport: openaiTransport,
  // Getter so toggling the checkbox takes effect on the next message.
  structuredOutput: () => structured.value,
});

// Keep the active conversation's title + timestamp in sync as it changes.
watch(
  messages,
  () => {
    const conv = active.value;
    if (!conv) return;
    conv.updatedAt = Date.now();
    if (conv.title === "New chat") {
      const firstUser = messages.value.find((m) => m.role === "user");
      if (firstUser?.content) {
        conv.title = firstUser.content.slice(0, 40) + (firstUser.content.length > 40 ? "…" : "");
      }
    }
  },
  { deep: true },
);

function selectConversation(id: string) {
  const conv = conversations.value.find((c) => c.id === id);
  if (!conv || conv.id === activeId.value) return;
  stop();
  error.value = null;
  activeId.value = id;
  // Same array reference, so useChat mutations persist back to the conversation.
  messages.value = conv.messages;
}

function newChat() {
  stop();
  error.value = null;
  const conv: Convo = { id: uid(), title: "New chat", messages: [welcome()], updatedAt: Date.now() };
  conversations.value.unshift(conv);
  activeId.value = conv.id;
  messages.value = conv.messages;
}

function deleteConversation(id: string) {
  const idx = conversations.value.findIndex((c) => c.id === id);
  if (idx === -1) return;
  conversations.value.splice(idx, 1);
  if (activeId.value === id) {
    if (conversations.value.length) selectConversation(conversations.value[0].id);
    else newChat();
  }
}

function clearActive() {
  stop();
  error.value = null;
  messages.value.splice(0, messages.value.length);
}

// Offer "Regenerate" once the last message is a finished assistant reply.
const canRegenerate = computed(() => {
  const last = messages.value.at(-1);
  return !isLoading.value && last?.role === "assistant";
});

function dismissError() {
  error.value = null;
}

// ChatInput emits staged attachments on submit; forward them to useChat.
function onSubmit(attachments: SendOptions["attachments"]) {
  handleSubmit({ attachments });
}

function onAttachmentReject({ file, reason }: { file: File; reason: string }) {
  error.value = new Error(
    reason === "size"
      ? `"${file.name}" is too large (max 2 MB).`
      : `"${file.name}" is not an allowed file type.`,
  );
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
  <ChatLayout class="h-screen">
    <!-- Sidebar: New session + Recent conversations -->
    <ChatSidebar>
      <template #header>
        <button
          type="button"
          class="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--agent-primary)] px-3 py-2 text-sm font-medium text-[var(--agent-primary-fg)] transition-opacity hover:opacity-90"
          @click="newChat"
        >
          <svg viewBox="0 0 24 24" class="size-4" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 5v14M5 12h14" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          New session
        </button>
      </template>

      <ChatConversationList
        label="Recent conversations"
        :conversations="conversationItems"
        :active-id="activeId"
        deletable
        @select="selectConversation"
        @delete="deleteConversation"
      />

      <template #footer>
        <label class="flex items-center justify-between gap-2 text-xs text-[var(--agent-muted)]">
          Theme
          <select
            :value="theme"
            class="rounded-lg border border-[var(--agent-border)] bg-[var(--agent-bg)] px-1.5 py-1 text-xs text-[var(--agent-fg)]"
            aria-label="Theme"
            @change="setTheme(($event.target as HTMLSelectElement).value)"
          >
            <option v-for="t in THEMES" :key="t" :value="t">{{ t }}</option>
          </select>
        </label>
      </template>
    </ChatSidebar>

    <!-- Main chat column -->
    <ChatWindow class="min-w-0 flex-1 !rounded-none !border-0">
      <ChatHeader :title="active?.title ?? 'Demo Agent'" :status="status">
        <template #leading>
          <ChatSidebarToggle />
        </template>
        <template #actions>
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
          <label
            class="flex cursor-pointer select-none items-center gap-1.5 text-xs text-[var(--agent-muted)]"
          >
            <input v-model="structured" type="checkbox" class="accent-[var(--agent-primary)]" />
            Structured
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
            @click="clearActive"
          >
            Clear
          </button>
        </template>
      </ChatHeader>

      <ChatMessages :messages="messages" :avatars="avatars" :virtualized="virtualized">
        <!-- Custom renderer for structured output. Remove this slot to fall
             back to the built-in <ChatObject> auto-renderer. -->
        <template #object="{ data, message }">
          <ChatStructured
            :data="data"
            :schema="answerSchema"
            :streaming="message.status === 'streaming'"
          />
        </template>
      </ChatMessages>

      <ChatError v-if="error" :error="error" @dismiss="dismissError" />

      <ChatInput
        v-model="input"
        :loading="isLoading"
        :can-regenerate="canRegenerate"
        placeholder="Ask the agent something..."
        @submit="onSubmit"
        @stop="stop"
        @regenerate="regenerate"
      >
        <Attachment
          :allowed="['.png', '.jpg', '.jpeg', '.gif', '.webp', '.pdf']"
          max-size="2mb"
          @reject="onAttachmentReject"
        />
      </ChatInput>
    </ChatWindow>
  </ChatLayout>
</template>
