import { computed, ref, type ComputedRef, type Ref } from "vue";
import type { ChatTransport, Message } from "../types";

/** Overall chat lifecycle state. */
export type ChatStatus = "idle" | "submitting" | "streaming" | "error";

export interface UseChatOptions {
  /** Messages to seed the conversation with. */
  initialMessages?: Message[];
  /**
   * How to produce assistant replies. Return a string, a Promise<string>
   * (non-streaming), or an AsyncIterable<string> (streaming).
   */
  transport?: ChatTransport;
  /** Custom id generator (defaults to a random id). */
  generateId?: () => string;
}

export interface UseChatReturn {
  messages: Ref<Message[]>;
  input: Ref<string>;
  /** True while a request is in flight (submitting or streaming). */
  isLoading: ComputedRef<boolean>;
  /** Fine-grained lifecycle: idle | submitting | streaming | error. */
  status: Ref<ChatStatus>;
  error: Ref<Error | null>;
  /** Append a user message and trigger the transport for an assistant reply. */
  sendMessage: (content: string) => Promise<void>;
  /** Convenience for forms: sends the current `input` value. */
  handleSubmit: () => Promise<void>;
  /** Re-run the transport for the most recent user message. */
  regenerate: () => Promise<void>;
  /** Abort an in-flight generation. The partial reply is kept. */
  stop: () => void;
  /** Clear the whole conversation. */
  clear: () => void;
}

function defaultId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

async function* toAsyncIterable(
  value: string | Promise<string> | AsyncIterable<string>,
): AsyncIterable<string> {
  if (typeof value === "string") {
    yield value;
    return;
  }
  if (value instanceof Promise) {
    yield await value;
    return;
  }
  yield* value;
}

/**
 * A Vercel-AI-SDK-style chat state container for Vue.
 *
 * Handles streaming + non-streaming transports, per-message status, loading
 * state, stop (abort) and regenerate.
 */
export function useChat(options: UseChatOptions = {}): UseChatReturn {
  const generateId = options.generateId ?? defaultId;
  const messages = ref<Message[]>(options.initialMessages ?? []);
  const input = ref("");
  const status = ref<ChatStatus>("idle");
  const error = ref<Error | null>(null);

  const isLoading = computed(
    () => status.value === "submitting" || status.value === "streaming",
  );

  // Tracks the active request so stop() can abort it.
  let controller: AbortController | null = null;

  /**
   * Pushes an assistant placeholder and drives the transport into it.
   * `userIndex` (if >= 0) is the user message whose status we mirror.
   */
  async function runAssistant(history: Message[], userIndex = -1): Promise<void> {
    if (!options.transport) {
      if (userIndex >= 0) messages.value[userIndex].status = "sent";
      status.value = "idle";
      return;
    }

    messages.value.push({
      id: generateId(),
      role: "assistant",
      content: "",
      createdAt: Date.now(),
      status: "streaming",
      pending: true,
    });
    // Mutate through the reactive array element so streamed updates render.
    const index = messages.value.length - 1;

    controller = new AbortController();
    const { signal } = controller;
    status.value = "submitting";
    error.value = null;
    let gotChunk = false;

    try {
      const result = options.transport(history, { signal });
      for await (const chunk of toAsyncIterable(result)) {
        if (signal.aborted) break;
        if (!gotChunk) {
          gotChunk = true;
          if (userIndex >= 0) messages.value[userIndex].status = "sent";
          status.value = "streaming";
        }
        messages.value[index].content += chunk;
      }
      if (userIndex >= 0) messages.value[userIndex].status = "sent";
      messages.value[index].status = signal.aborted ? "stopped" : "sent";
    } catch (err) {
      const aborted = signal.aborted || (err instanceof Error && err.name === "AbortError");
      if (aborted) {
        messages.value[index].status = "stopped";
      } else {
        error.value = err instanceof Error ? err : new Error(String(err));
        messages.value[index].status = "error";
        messages.value[index].error = error.value.message;
        if (userIndex >= 0) messages.value[userIndex].status = "error";
      }
    } finally {
      messages.value[index].pending = false;
      controller = null;
      status.value = error.value ? "error" : "idle";
    }
  }

  async function sendMessage(content: string): Promise<void> {
    const text = content.trim();
    if (!text || isLoading.value) return;

    error.value = null;
    messages.value.push({
      id: generateId(),
      role: "user",
      content: text,
      createdAt: Date.now(),
      status: "sending",
    });
    const userIndex = messages.value.length - 1;
    const history = messages.value.slice(0, userIndex + 1);
    await runAssistant(history, userIndex);
  }

  async function handleSubmit(): Promise<void> {
    const text = input.value;
    input.value = "";
    await sendMessage(text);
  }

  async function regenerate(): Promise<void> {
    if (isLoading.value) return;

    // Find the most recent user message.
    let lastUser = -1;
    for (let i = messages.value.length - 1; i >= 0; i--) {
      if (messages.value[i].role === "user") {
        lastUser = i;
        break;
      }
    }
    if (lastUser === -1) return;

    error.value = null;
    // Drop everything after that user message (the previous assistant reply).
    messages.value.splice(lastUser + 1);
    const history = messages.value.slice(0, lastUser + 1);
    await runAssistant(history, lastUser);
  }

  function stop(): void {
    controller?.abort();
  }

  function clear(): void {
    controller?.abort();
    messages.value = [];
    error.value = null;
    status.value = "idle";
  }

  return {
    messages,
    input,
    isLoading,
    status,
    error,
    sendMessage,
    handleSubmit,
    regenerate,
    stop,
    clear,
  };
}
