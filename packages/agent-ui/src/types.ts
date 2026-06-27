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
  | "table"
  /** Collapsible step (e.g. thinking / reasoning / looking). */
  | "accordion"
  /** Render the value as markdown (e.g. the final response). */
  | "markdown"
  /** Render an array of {@link Suggestion} as connector/MCP cards. */
  | "suggestions";

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
  /** For `accordion`: start expanded (defaults to collapsing once `response` arrives). */
  defaultOpen?: boolean;
  /** For `accordion`: optional icon hint ("thinking" | "reasoning" | "looking"). */
  icon?: "thinking" | "reasoning" | "looking" | "search";
}

/** Connection state of a connector/MCP. */
export type ConnectorStatus = "available" | "needs_auth" | "connecting" | "connected" | "error";

/**
 * A connectable app (Composio connector) or custom MCP server, listed in
 * `<ChatConnectorsModal>` and referenced by suggestions.
 */
export interface ConnectorApp {
  /** Stable id, e.g. "gmail" or "heygen". */
  id: string;
  name: string;
  description?: string;
  /** Icon URL (falls back to an initial). */
  icon?: string;
  /** "connector" (Composio) or "mcp" (custom MCP server). */
  kind?: "connector" | "mcp";
  /** Whether connecting requires auth (OAuth / API key). */
  requiresAuth?: boolean;
  /** For custom MCP entries. */
  url?: string;
}

/**
 * A suggested connector/MCP emitted in structured output and rendered as a
 * card (via the `suggestions` field type / `<ChatSuggestion>`).
 */
export interface Suggestion {
  id: string;
  /** Matches a {@link ConnectorApp} id so connection state can be resolved. */
  app?: string;
  /** "connector" (Composio app) or "mcp" (custom MCP server). */
  kind?: "connector" | "mcp";
  name: string;
  description?: string;
  icon?: string;
  /** Hint about why this needs action; resolved live against connected state. */
  status?: ConnectorStatus;
  /** Override the action button label (defaults based on status). */
  actionLabel?: string;
}

/** A saved conversation, rendered by `<ChatConversationList>` in the sidebar. */
export interface Conversation {
  /** Stable unique id. */
  id: string;
  /** Display title (e.g. derived from the first user message). */
  title: string;
  /** Last-updated time, used for ordering / relative labels. */
  updatedAt?: Date | number;
  /** Optional one-line preview of the last message. */
  preview?: string;
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
