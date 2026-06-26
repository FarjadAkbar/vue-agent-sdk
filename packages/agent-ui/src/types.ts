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
  /**
   * Parsed structured output. When set, the message renders as structured
   * data (via `<ChatObject>` or a custom `#object` slot) instead of `content`.
   * During streaming with structured output enabled, this is progressively
   * populated from a partial-JSON parse of the streamed buffer.
   */
  data?: unknown;
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

/**
 * How a single field of structured output should be rendered by
 * `<ChatStructured>`.
 *
 * - `title`   — prominent heading.
 * - `summary` — muted intro paragraph.
 * - `text`    — labelled single value.
 * - `steps`   — ordered, numbered stepper (array of objects).
 * - `list`    — bulleted list (array of primitives).
 * - `tags`    — chips (array of primitives).
 * - `table`   — table (array of flat objects).
 */
export type StructuredFieldType =
  | "title"
  | "summary"
  | "text"
  | "steps"
  | "list"
  | "tags"
  | "table";

/** A declarative description of one field in a structured-output object. */
export interface StructuredField {
  /** Property name in the structured data object. */
  key: string;
  /** How to render the value. Defaults to "text" (or inferred when omitted). */
  type?: StructuredFieldType;
  /** Optional section label shown above the value. */
  label?: string;
  /** For `steps`: property holding each step's title. Defaults to "name". */
  nameKey?: string;
  /** For `steps`: property holding each step's detail. Defaults to "detail". */
  detailKey?: string;
  /** For `table`: explicit column order. Inferred from rows when omitted. */
  columns?: string[];
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
