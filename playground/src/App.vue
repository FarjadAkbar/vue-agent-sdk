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
  useConnectors,
  ChatStructured,
  ChatAttachment as Attachment,
  ChatConnectors as Connectors,
  ChatConnectorsModal as ConnectorsModal,
  type ChatTransport,
  type ThemeSetting,
  type StructuredField,
  type SendOptions,
  type Conversation,
  type ConnectorApp,
  type Message,
} from "@vue-agent-sdk/ui";

// Structured-output schema: the agent always streams this shape, rendered as
// collapsible accordion steps + connector suggestion cards + a final answer.
const answerSchema: StructuredField[] = [
  { key: "thinking", type: "accordion", label: "Thinking", icon: "thinking" },
  { key: "reasoning", type: "accordion", label: "Reasoning", icon: "reasoning" },
  { key: "looking", type: "accordion", label: "Looking for tools", icon: "looking" },
  { key: "suggestions", type: "suggestions", label: "Suggested connectors" },
  { key: "response", type: "markdown" },
];

// Theme switcher (applies a `data-theme` to <html>, persisted to localStorage).
const { theme, setTheme } = useTheme({ default: "dark" });
const THEMES: ThemeSetting[] = ["system", "light", "dark", "emerald", "rose"];

// --- Connectors (Composio apps + custom MCP) --------------------------------
// Mock Composio catalog. In a real app this comes from the Composio API and
// `onConnect` kicks off the OAuth / API-key flow.
const composioApps: ConnectorApp[] = [
  { id: "browser", name: "My Browser", description: "Access the web on your own browser", kind: "connector" },
  { id: "gmail", name: "Gmail", description: "Draft replies, search your inbox, summarize threads", kind: "connector", requiresAuth: true },
  { id: "github", name: "GitHub", description: "Manage repositories and track code changes", kind: "connector", requiresAuth: true },
  { id: "instagram", name: "Instagram", description: "Generate and publish Posts, Stories, or Reels", kind: "connector", requiresAuth: true },
  { id: "googledrive", name: "Google Drive", description: "Access files and manage documents", kind: "connector", requiresAuth: true },
  { id: "metaads", name: "Meta Ads Manager", description: "Automate ad insights and optimization", kind: "connector", requiresAuth: true },
  { id: "googlecalendar", name: "Google Calendar", description: "Understand your schedule and manage events", kind: "connector", requiresAuth: true },
  { id: "notion", name: "Notion", description: "Search workspace content and automate workflows", kind: "connector", requiresAuth: true },
  { id: "heygen", name: "HeyGen", description: "Generate AI avatar videos with voiceover", kind: "connector", requiresAuth: true },
];

const connectors = useConnectors({
  apps: composioApps,
  connected: ["instagram"],
  custom: true,
});

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
    content: "Hey! I'm a demo agent built with the Vue Agent SDK. Try: \"make a promotional video\".",
    status: "sent",
  };
}

const conversations = ref<Convo[]>([
  { id: uid(), title: "New chat", messages: [welcome()], updatedAt: Date.now() },
  {
    id: uid(),
    title: "Promotional video with HeyGen",
    updatedAt: Date.now() - 60_000,
    messages: [
      { id: uid(), role: "user", content: "Generate a promotional video", status: "sent" },
      { id: uid(), role: "assistant", content: "I'll need the HeyGen connector for that.", status: "sent" },
    ],
  },
]);

const activeId = ref(conversations.value[0].id);
const active = computed(() => conversations.value.find((c) => c.id === activeId.value));

const conversationItems = computed<Conversation[]>(() =>
  [...conversations.value]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .map((c) => ({ id: c.id, title: c.title, updatedAt: c.updatedAt })),
);

const avatars = {
  user: "https://api.dicebear.com/9.x/thumbs/svg?seed=you",
  assistant: "https://api.dicebear.com/9.x/bottts/svg?seed=agent",
};

const virtualized = ref(false);

// Connector the agent is waiting on before it can continue (stop-ask-continue).
const awaitingConnector = ref<string | null>(null);

const awaitingApp = computed(() =>
  awaitingConnector.value ? composioApps.find((a) => a.id === awaitingConnector.value) : undefined,
);

// True once the awaited connector is connected -> we can resume the generation.
const canContinue = computed(
  () =>
    !!awaitingConnector.value &&
    connectors.isConnected(awaitingConnector.value) &&
    !isLoading.value,
);

function answerFor(q: string): string {
  if (/vue|deploy/.test(q)) return "Build with `vite build` and host the `dist/` folder on any static host.";
  if (/coffee/.test(q)) return "Start around a **1:16** coffee-to-water ratio and adjust to taste.";
  return "Here's a concise answer based on what you asked. Connect tools from the 🔗 menu to unlock more capabilities.";
}

function buildAnswer(query: string): Record<string, unknown> {
  const q = query.toLowerCase();
  const needsVideo = /(video|heygen|promo|reel|avatar|clip)/.test(q);
  const heyConnected = connectors.isConnected("heygen");

  if (needsVideo && !heyConnected) {
    return {
      thinking:
        "The user wants to create a promotional video. Let me break this into steps and figure out which tool can render it.",
      reasoning:
        "Generating a video needs a dedicated avatar/voiceover tool. I don't have one connected yet, so I'll look through the connector catalog and suggest the best match.",
      looking: {
        tool: { label: "Searching connectors", code: "video-generation" },
        text: "Scanned the Composio app catalog for video generation. HeyGen matches best (AI avatars + voiceover).",
      },
      suggestions: [
        {
          id: "heygen",
          app: "heygen",
          kind: "connector",
          name: "HeyGen",
          description: "Please login to use this connector",
          actionLabel: "Log in",
        },
      ],
      response:
        "I can generate the promotional video, but I need access to **HeyGen** first. Connect it using the card above (or the 🔗 button by the input), then press **Continue** and I'll pick up right where I left off.",
    };
  }

  if (needsVideo && heyConnected) {
    return {
      thinking: "HeyGen is connected now — I have everything I need to produce the promotional video.",
      reasoning:
        "I'll draft a short script, pick an avatar + voice, render the clip with HeyGen, and return a shareable link.",
      looking: {
        tool: { label: "Calling connector", code: "heygen.generate_video" },
        text: "Using connected tools: HeyGen (video generation).",
      },
      suggestions: [
        {
          id: "heygen",
          app: "heygen",
          kind: "connector",
          name: "HeyGen",
          description: "Connected",
          actionLabel: "Manage",
        },
      ],
      response:
        "Done! Here's your promotional video:\n\n1. **Script** — a punchy 20-second hook about the product.\n2. **Avatar + voice** — professional preset, English (US).\n3. **Render** — 1080p, ready to share.\n\n[▶ View generated video](https://example.com/heygen/clip) · *generated with HeyGen*",
    };
  }

  return {
    thinking: `Parsing the request: "${query}". Identifying intent and the smallest plan to answer well.`,
    reasoning: "This is answerable directly without external tools, so I'll compose a clear, structured reply.",
    looking: "No external connectors required for this one.",
    suggestions: [],
    response: answerFor(q),
  };
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Simulated structured agent. Streams the JSON object slice-by-slice so the
// accordion steps and final answer fill in progressively. Swap this for a real
// transport (OpenAI + Composio tool-calls) returning the same schema.
const agentTransport: ChatTransport = async function* (history, { signal }) {
  const lastUser = [...history].reverse().find((m) => m.role === "user");
  const target = buildAnswer(lastUser?.content ?? "");

  awaitingConnector.value =
    Array.isArray(target.suggestions) && target.suggestions.length && !connectors.isConnected("heygen")
      ? "heygen"
      : null;

  const json = JSON.stringify(target);
  const size = 5;
  for (let i = 0; i < json.length; i += size) {
    if (signal?.aborted) return;
    await delay(14);
    yield json.slice(i, i + size);
  }
};

const { messages, input, isLoading, status, error, handleSubmit, regenerate, stop } = useChat({
  initialMessages: conversations.value[0].messages,
  transport: agentTransport,
  // Plain text is removed — every reply is structured output.
  structuredOutput: true,
});

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
  awaitingConnector.value = null;
  activeId.value = id;
  messages.value = conv.messages;
}

function newChat() {
  stop();
  error.value = null;
  awaitingConnector.value = null;
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
  awaitingConnector.value = null;
  messages.value.splice(0, messages.value.length);
}

const canRegenerate = computed(() => {
  const last = messages.value.at(-1);
  return !isLoading.value && last?.role === "assistant" && !awaitingConnector.value;
});

function dismissError() {
  error.value = null;
}

// Resume generation once the required connector is connected.
function continueGeneration() {
  awaitingConnector.value = null;
  regenerate();
}

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
          <button
            type="button"
            class="rounded-lg px-2.5 py-1 text-xs text-[var(--agent-muted)] transition-colors hover:text-[var(--agent-fg)]"
            @click="connectors.open()"
          >
            Connectors
          </button>
          <label
            class="flex cursor-pointer select-none items-center gap-1.5 text-xs text-[var(--agent-muted)]"
          >
            <input v-model="virtualized" type="checkbox" class="accent-[var(--agent-primary)]" />
            Virtualize
          </label>
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
        <template #object="{ data, message }">
          <ChatStructured
            :data="data"
            :schema="answerSchema"
            :streaming="message.status === 'streaming'"
          />
        </template>
      </ChatMessages>

      <ChatError v-if="error" :error="error" @dismiss="dismissError" />

      <!-- Stop-ask-continue: the agent paused waiting for a connector. -->
      <div
        v-if="awaitingConnector"
        class="flex shrink-0 items-center justify-between gap-3 border-t border-[var(--agent-border)] bg-[var(--agent-surface)] px-4 py-2.5"
      >
        <span class="text-xs text-[var(--agent-muted)]">
          <template v-if="canContinue">
            {{ awaitingApp?.name }} connected — ready to continue.
          </template>
          <template v-else> Connect {{ awaitingApp?.name }} to continue. </template>
        </span>
        <button
          type="button"
          class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
          :class="
            canContinue
              ? 'bg-[var(--agent-primary)] text-[var(--agent-primary-fg)] hover:opacity-90'
              : 'bg-[var(--agent-surface-2)] text-[var(--agent-muted)]'
          "
          :disabled="!canContinue"
          @click="continueGeneration"
        >
          <svg viewBox="0 0 24 24" class="size-3.5" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="m9 18 6-6-6-6" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          Continue
        </button>
      </div>

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
        <Connectors :connected="['instagram']" />
      </ChatInput>
    </ChatWindow>

    <!-- Connectors modal: Composio apps + custom MCP. Coordinates with the
         <Connectors> trigger and suggestion cards via the connectors store. -->
    <ConnectorsModal :apps="composioApps" :custom="true" />
  </ChatLayout>
</template>
