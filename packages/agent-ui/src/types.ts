export type ChatRole = "user" | "assistant" | "system";

/**
 * Lifecycle status of an individual message.
 * - `sending`   — user message dispatched, awaiting the request to start.
 * - `streaming` — assistant message currently being generated.
 * - `sent`      — completed successfully.
 * - `stopped`   — generation was cancelled by the user.
 * - `error`     — the request failed.
 */
export type MessageStatus = "sending" | "streaming" | "sent" | "stopped" | "error";

/** An image or file attached to a message. */
export interface Attachment {
  id?: string;
  /** "image" renders inline; everything else renders as a file chip. */
  type: "image" | "file";
  /** Source URL or data URI. */
  url: string;
  name?: string;
  mimeType?: string;
  /** Size in bytes (rendered human-readable on file chips). */
  size?: number;
}

export type ToolCallStatus = "pending" | "running" | "success" | "error";

/** A tool/function invocation made by the assistant. */
export interface ToolCall {
  id: string;
  /** Tool/function name, e.g. "get_weather". */
  name: string;
  /** Arguments passed to the tool (object or pre-stringified JSON). */
  args?: unknown;
  /** Tool result, shown when present. */
  result?: unknown;
  status?: ToolCallStatus;
}

/** A source reference backing part of the reply. */
export interface Citation {
  id?: string;
  title?: string;
  url: string;
  snippet?: string;
}

export interface Message {
  /** Stable unique id for the message. */
  id: string;
  /** Who authored the message. */
  role: ChatRole;
  /** Text content of the message (rendered as markdown for the assistant). */
  content: string;
  /** Optional creation timestamp. */
  createdAt?: Date | number;
  /** Current lifecycle status (drives status badges + typing indicator). */
  status?: MessageStatus;
  /** Human-readable error message when `status === "error"`. */
  error?: string;
  /** Collapsible "thinking" / reasoning trace shown above the answer. */
  reasoning?: string;
  /** Tool calls made while producing this message. */
  toolCalls?: ToolCall[];
  /** Images / files attached to the message. */
  attachments?: Attachment[];
  /** Source citations shown beneath the answer. */
  citations?: Citation[];
  /**
   * @deprecated Use `status === "streaming"` instead. Kept for backwards
   * compatibility; still set to `true` while an assistant reply streams.
   */
  pending?: boolean;
}

/** Per-request options handed to a {@link ChatTransport}. */
export interface ChatTransportOptions {
  /** Aborts when the consumer calls `stop()`. Forward it to `fetch`. */
  signal: AbortSignal;
}

/**
 * A transport function: given the current conversation, produce the assistant
 * reply. It can return a plain string, a Promise of a string (non-streaming),
 * or an async iterable of string chunks (streaming).
 */
export type ChatTransport = (
  messages: Message[],
  options: ChatTransportOptions,
) => string | Promise<string> | AsyncIterable<string>;
