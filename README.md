# Vue Agent SDK

A Vercel-AI-SDK-style toolkit for building **AI agent chat UIs in Vue 3**.
Tailwind-styled, [Lenis](https://github.com/darkroomengineering/lenis) smooth
scrolling, and a shadcn-style "own the components" philosophy.

```
vue-agent-sdk/
├── packages/agent-ui   # the SDK  →  @vue-agent-sdk/ui
└── playground          # a Vite + Vue test app that consumes the SDK
```

## Quick start

```bash
pnpm install        # install the whole workspace
pnpm build:ui       # build the SDK (dist/ + types)

# Add your OpenAI key so the playground can hit a real backend:
cp playground/.env.example playground/.env   # then edit OPENAI_API_KEY

pnpm dev            # runs the Express API (:8787) + the web app (:5173)
```

Open http://localhost:5173 and chat — responses stream live from OpenAI.

## Playground backend (real OpenAI)

The playground ships a tiny Express server that proxies OpenAI's
`chat.completions` streaming API:

- `playground/server/index.mjs` — `POST /api/chat` streams the reply as plain
  text chunks; `GET /api/health` reports status.
- Vite proxies `/api` → `http://localhost:8787` (see `playground/vite.config.ts`).
- `playground/src/App.vue` wires a `ChatTransport` that `fetch()`es `/api/chat`
  and yields each streamed chunk into `useChat`.

Configure via `playground/.env`:

| Var              | Default        | Description                  |
| ---------------- | -------------- | ---------------------------- |
| `OPENAI_API_KEY` | —              | Required. Your OpenAI key.   |
| `OPENAI_MODEL`   | `gpt-4o-mini`  | Chat model to use.           |
| `PORT`           | `8787`         | API server port.             |

## What's in the SDK

### Components

The components are composable building blocks. `ChatWindow` is a styled layout
shell; you nest the pieces you want inside it.

| Component      | Description                                                                |
| -------------- | -------------------------------------------------------------------------- |
| `ChatWindow`   | Layout shell (flex column, border, rounded). Slot the pieces below into it.|
| `ChatHeader`   | Title + status dot (`idle`/`streaming`/`error`) + an `#actions` slot.      |
| `ChatMessages` | Scrollable, Lenis-smooth list. Pass `:messages`. Grows to fill the window. |
| `ChatMessage`  | A single message bubble + typing indicator + status badge.                 |
| `ChatInput`    | Auto-growing textarea, Send/Stop toggle, optional Regenerate. `v-model`.   |
| `ChatError`    | Error banner with optional Retry / Dismiss. Pass `:error`.                 |

> `ChatComposer` is kept as a deprecated alias of `ChatInput`.

### Composables

- `useChat()` — reactive chat state (`messages`, `input`, `status`, `isLoading`,
  `error`) plus `sendMessage`, `handleSubmit`, `regenerate`, `stop`, `clear`.
  Pluggable streaming/non-streaming `transport`, à la `@ai-sdk/vue`.
- `useLenis()` — attaches Lenis smooth scrolling to a scroll container.

## Usage

```vue
<script setup lang="ts">
import {
  ChatWindow, ChatHeader, ChatMessages, ChatInput, ChatError,
  useChat, type ChatTransport,
} from "@vue-agent-sdk/ui";
import "@vue-agent-sdk/ui/styles.css"; // design tokens + animations

// Plug in any backend. Forward `signal` so stop() can abort the request.
const transport: ChatTransport = async function* (messages, { signal }) {
  const res = await fetch("/api/chat", {
    method: "POST",
    body: JSON.stringify({ messages }),
    signal,
  });
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    yield decoder.decode(value);
  }
};

const { messages, input, isLoading, status, error, handleSubmit, regenerate, stop } =
  useChat({ transport });

function dismissError() {
  error.value = null;
}
</script>

<template>
  <ChatWindow>
    <ChatHeader title="AI Assistant" :status="status" />
    <ChatMessages :messages="messages" />
    <ChatError v-if="error" :error="error" @dismiss="dismissError" />
    <ChatInput
      v-model="input"
      :loading="isLoading"
      placeholder="Ask anything..."
      @submit="handleSubmit"
      @stop="stop"
      @regenerate="regenerate"
    />
  </ChatWindow>
</template>
```

## Styling (shadcn-style)

The components use Tailwind utility classes that reference CSS custom properties
(`--agent-bg`, `--agent-primary`, …) defined in `@vue-agent-sdk/ui/styles.css`.

- **You own Tailwind.** Make sure Tailwind scans the SDK so its classes are
  generated. With Tailwind v4, add to your CSS:

  ```css
  @import "tailwindcss";
  @source "../node_modules/@vue-agent-sdk/ui/dist";
  ```

- **Re-theme** by overriding the tokens anywhere in your app, e.g.

  ```css
  :root { --agent-primary: #10b981; }
  ```

- **Dark mode** ships out of the box via a `.dark` class (or `[data-theme="dark"]`).

## Scripts

| Command                          | Description                              |
| -------------------------------- | ---------------------------------------- |
| `pnpm dev`                       | Run the API + web playground together.   |
| `pnpm --filter playground dev:web` | Web app only (Vite).                   |
| `pnpm --filter playground dev:api` | API only (Express).                    |
| `pnpm build:ui`                  | Build the SDK package only.              |
| `pnpm build`                     | Build the SDK and the playground.        |
| `pnpm typecheck`                 | Type-check every workspace package.      |
